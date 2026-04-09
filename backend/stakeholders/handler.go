package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

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
	mux.HandleFunc("GET /profile", s.handleGetProfile)
	mux.HandleFunc("PUT /profile", s.handleUpdateProfile)
	mux.HandleFunc("GET /admin/accounts", s.handleGetAllAccounts)
	mux.HandleFunc("PUT /admin/accounts/{id}/block", s.handleBlockAccount)
	mux.HandleFunc("GET /admin/profiles", s.handleGetAllProfiles)
	return loggingMiddleware(mux)
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

	if account.IsBlocked {
		writeError(w, http.StatusForbidden, "account is blocked")
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

func (s *server) handleGetProfile(w http.ResponseWriter, r *http.Request) {
	payload, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if payload.Role != RoleGuide && payload.Role != RoleTourist {
		writeError(w, http.StatusForbidden, "only guides and tourists have profiles")
		return
	}

	profile, err := getProfileByAccountID(s.db, payload.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch profile")
		return
	}

	writeJSON(w, http.StatusOK, profile)
}

func (s *server) handleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	payload, err := bearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if payload.Role != RoleGuide && payload.Role != RoleTourist {
		writeError(w, http.StatusForbidden, "only guides and tourists have profiles")
		return
	}

	var profile Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	profile.AccountID = payload.UserID

	if err := upsertProfile(s.db, &profile); err != nil {
		writeError(w, http.StatusInternalServerError, "could not update profile")
		return
	}

	writeJSON(w, http.StatusOK, &profile)
}

// GET /admin/accounts  (requires administrator role)
func (s *server) handleGetAllAccounts(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(r); err != nil {
		writeError(w, http.StatusForbidden, err.Error())
		return
	}

	accounts, err := getAllAccounts(s.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch accounts")
		return
	}

	if accounts == nil {
		accounts = []Account{}
	}
	writeJSON(w, http.StatusOK, accounts)
}

// PUT /admin/accounts/{id}/block  (requires administrator role)
func (s *server) handleBlockAccount(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(r); err != nil {
		writeError(w, http.StatusForbidden, err.Error())
		return
	}

	idStr := r.PathValue("id")
	accountID, err := strconv.Atoi(idStr)
	if err != nil || accountID <= 0 {
		writeError(w, http.StatusBadRequest, "invalid account id")
		return
	}

	var req BlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := setAccountBlocked(s.db, accountID, req.Blocked); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "account not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not update account")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": accountID, "blocked": req.Blocked})
}

func (s *server) handleGetAllProfiles(w http.ResponseWriter, r *http.Request) {
	if err := requireAdmin(r); err != nil {
		writeError(w, http.StatusForbidden, err.Error())
		return
	}

	profiles, err := getAllProfiles(s.db)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not fetch profiles")
		return
	}

	if profiles == nil {
		profiles = []Profile{}
	}
	writeJSON(w, http.StatusOK, profiles)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func requireAdmin(r *http.Request) error {
	payload, err := bearerToken(r)
	if err != nil {
		return err
	}
	if payload.Role != RoleAdministrator {
		return errors.New("administrator role required")
	}
	return nil
}

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
