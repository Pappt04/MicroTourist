package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"golang.org/x/crypto/bcrypt"
)

type server struct {
	db *sql.DB
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", s.handleRegister)
	mux.HandleFunc("POST /login", s.handleLogin)
	mux.HandleFunc("GET /me", s.handleMe)
	return mux
}

// POST /register
func (s *server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Username == "" || req.Password == "" || req.Email == "" {
		writeError(w, http.StatusBadRequest, "username, password and email are required")
		return
	}

	if req.Role != RoleGuide && req.Role != RoleTourist {
		writeError(w, http.StatusBadRequest, "role must be 'guide' or 'tourist'")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	account, err := createAccount(s.db, req.Username, req.Email, string(hash), req.Role)
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "username or email already taken")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	writeJSON(w, http.StatusCreated, account)
}

// POST /login
func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Username == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "username and password are required")
		return
	}

	account, hash, err := getAccountByUsername(s.db, req.Username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not fetch account")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := generateToken(account)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not generate token")
		return
	}

	writeJSON(w, http.StatusOK, LoginResponse{Token: token, Account: *account})
}

// GET /me  (requires Authorization: Bearer <token>)
func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	payload, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":       payload.UserID,
		"username": payload.Username,
		"role":     payload.Role,
	})
}

// ── helpers ──────────────────────────────────────────────────────────────────

func bearerToken(r *http.Request) (*tokenPayload, error) {
	auth := r.Header.Get("Authorization")
	if len(auth) < 8 || auth[:7] != "Bearer " {
		return nil, errors.New("missing or malformed Authorization header")
	}
	return validateToken(auth[7:])
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	err := json.NewEncoder(w).Encode(v)
	if err != nil {
		log.Printf("There has been en arror encoding json, Error: %s", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func isUniqueViolation(err error) bool {
	return err != nil && len(err.Error()) > 0 &&
		contains(err.Error(), "23505") ||
		contains(err.Error(), "unique constraint") ||
		contains(err.Error(), "duplicate key")
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && indexStr(s, sub) >= 0)
}

func indexStr(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
