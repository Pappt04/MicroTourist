package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"
)

type tokenPayload struct {
	UserID   int    `json:"uid"`
	Username string `json:"usr"`
	Role     Role   `json:"role"`
	Expires  int64  `json:"exp"`
}

func tokenSecret() []byte {
	s := os.Getenv("TOKEN_SECRET")
	if s == "" {
		s = "change-me-in-production"
	}
	return []byte(s)
}

func generateToken(a *Account) (string, error) {
	payload := tokenPayload{
		UserID:   a.ID,
		Username: a.Username,
		Role:     a.Role,
		Expires:  time.Now().Add(24 * time.Hour).Unix(),
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	encoded := base64.RawURLEncoding.EncodeToString(data)
	mac := hmac.New(sha256.New, tokenSecret())
	mac.Write([]byte(encoded))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))

	return fmt.Sprintf("%s.%s", encoded, sig), nil
}

func validateToken(token string) (*tokenPayload, error) {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return nil, errors.New("malformed token")
	}
	encoded, sig := parts[0], parts[1]

	mac := hmac.New(sha256.New, tokenSecret())
	mac.Write([]byte(encoded))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return nil, errors.New("invalid token signature")
	}

	data, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, errors.New("malformed token payload")
	}

	var payload tokenPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, errors.New("malformed token payload")
	}

	if time.Now().Unix() > payload.Expires {
		return nil, errors.New("token expired")
	}

	return &payload, nil
}
