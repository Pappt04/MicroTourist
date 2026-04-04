package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestServer() *server {
	return &server{db: nil}
}

func doRequest(t *testing.T, handler http.Handler, method, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("could not encode request body: %v", err)
		}
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	return rr
}

func decodeBody(t *testing.T, rr *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&m); err != nil {
		t.Fatalf("could not decode response body: %v", err)
	}
	return m
}

func TestHandleRegister_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString("not json"))
	rr := httptest.NewRecorder()
	newTestServer().handleRegister(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleRegister_MissingUsername(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register",
		RegisterRequest{Password: "pass", Email: "a@b.com", Role: RoleTourist})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleRegister_MissingPassword(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register",
		RegisterRequest{Username: "ana", Email: "a@b.com", Role: RoleTourist})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleRegister_MissingEmail(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register",
		RegisterRequest{Username: "ana", Password: "pass", Role: RoleTourist})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleRegister_InvalidRole(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register",
		RegisterRequest{Username: "ana", Password: "pass", Email: "a@b.com", Role: RoleAdministrator})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
	body := decodeBody(t, rr)
	if body["error"] == "" {
		t.Error("expected error message in response body")
	}
}

func TestHandleRegister_EmptyBody(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register", nil)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleLogin_InvalidJSON(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString("not json"))
	rr := httptest.NewRecorder()
	newTestServer().handleLogin(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleLogin_MissingUsername(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/login",
		LoginRequest{Password: "pass"})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleLogin_MissingPassword(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/login",
		LoginRequest{Username: "ana"})

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleLogin_EmptyBody(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/login", nil)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusBadRequest)
	}
}

func TestHandleMe_NoAuthHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	rr := httptest.NewRecorder()
	newTestServer().handleMe(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusUnauthorized)
	}
}

func TestHandleMe_MalformedToken(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer not.a.valid.token")
	rr := httptest.NewRecorder()
	newTestServer().handleMe(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusUnauthorized)
	}
}

func TestHandleMe_ValidToken(t *testing.T) {
	account := &Account{ID: 7, Username: "ana", Role: RoleTourist}
	token, err := generateToken(account)
	if err != nil {
		t.Fatalf("generateToken: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	newTestServer().handleMe(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusOK)
	}

	body := decodeBody(t, rr)
	if body["username"] != "ana" {
		t.Errorf("username: got %v, want ana", body["username"])
	}
	if body["role"] != string(RoleTourist) {
		t.Errorf("role: got %v, want %s", body["role"], RoleTourist)
	}
}

func TestHandleMe_ExpiredToken(t *testing.T) {
	p := tokenPayload{UserID: 1, Username: "ana", Role: RoleTourist}
	p.Expires = 1
	token, _ := buildTokenFromPayload(p)

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rr := httptest.NewRecorder()
	newTestServer().handleMe(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusUnauthorized)
	}
}

func TestErrorResponse_HasErrorField(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/register",
		RegisterRequest{Username: "x", Password: "y", Email: "z@z.com", Role: "invalid"})

	body := decodeBody(t, rr)
	if _, ok := body["error"]; !ok {
		t.Error("expected 'error' field in error response")
	}
}

func TestResponseContentType(t *testing.T) {
	rr := doRequest(t, newTestServer().routes(), http.MethodPost, "/login",
		LoginRequest{Username: "", Password: ""})

	ct := rr.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type: got %q, want %q", ct, "application/json")
	}
}
