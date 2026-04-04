package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"
)

func buildTokenFromPayload(p tokenPayload) (string, error) {
	data, err := json.Marshal(p)
	if err != nil {
		return "", err
	}
	encoded := base64.RawURLEncoding.EncodeToString(data)
	mac := hmac.New(sha256.New, tokenSecret())
	mac.Write([]byte(encoded))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return fmt.Sprintf("%s.%s", encoded, sig), nil
}

func TestGenerateAndValidateToken(t *testing.T) {
	account := &Account{ID: 1, Username: "ana", Email: "ana@example.com", Role: RoleTourist}

	token, err := generateToken(account)
	if err != nil {
		t.Fatalf("generateToken error: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}

	payload, err := validateToken(token)
	if err != nil {
		t.Fatalf("validateToken error: %v", err)
	}

	if payload.UserID != account.ID {
		t.Errorf("UserID: got %d, want %d", payload.UserID, account.ID)
	}
	if payload.Username != account.Username {
		t.Errorf("Username: got %s, want %s", payload.Username, account.Username)
	}
	if payload.Role != account.Role {
		t.Errorf("Role: got %s, want %s", payload.Role, account.Role)
	}
	if payload.Expires <= time.Now().Unix() {
		t.Error("token should expire in the future")
	}
}

func TestValidateToken_InvalidSignature(t *testing.T) {
	account := &Account{ID: 2, Username: "bob", Role: RoleGuide}
	token, _ := generateToken(account)

	_, err := validateToken(token + "tampered")
	if err == nil {
		t.Fatal("expected error for tampered signature, got nil")
	}
}

func TestValidateToken_Malformed(t *testing.T) {
	cases := []string{"", "nodot"}
	for _, tc := range cases {
		_, err := validateToken(tc)
		if err == nil {
			t.Errorf("expected error for token %q, got nil", tc)
		}
	}
}

func TestValidateToken_Expired(t *testing.T) {
	p := tokenPayload{
		UserID:   3,
		Username: "expired",
		Role:     RoleTourist,
		Expires:  time.Now().Add(-1 * time.Hour).Unix(),
	}
	expiredToken, err := buildTokenFromPayload(p)
	if err != nil {
		t.Fatalf("could not build expired token: %v", err)
	}

	_, err = validateToken(expiredToken)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestTokenSecret_DefaultFallback(t *testing.T) {
	err := os.Unsetenv("TOKEN_SECRET")
	if err != nil {
		t.Errorf("error in unsetting env variable: %s", err)
	}
	s := tokenSecret()
	if len(s) == 0 {
		t.Error("expected non-empty default secret")
	}
}

func TestTokenSecret_FromEnv(t *testing.T) {
	err := os.Setenv("TOKEN_SECRET", "my-test-secret")
	if err != nil {
		t.Errorf("error in unsetting env variable: %s", err)
	}
	defer func() {
		err := os.Unsetenv("TOKEN_SECRET")
		if err != nil {
			t.Errorf("error in unsetting env variable: %s", err)
		}
	}()

	s := tokenSecret()
	if string(s) != "my-test-secret" {
		t.Errorf("got %q, want %q", s, "my-test-secret")
	}
}
