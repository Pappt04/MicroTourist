package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "microtourist/gateway-go/pb"
)

func main() {
	addr := getEnv("STAKEHOLDERS_GRPC_ADDR", "localhost:9090")

	conn, err := grpc.Dial(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("cannot connect to stakeholders gRPC: %v", err)
	}
	defer conn.Close()

	client := pb.NewStakeholdersServiceClient(conn)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /register", handleRegister(client))
	mux.HandleFunc("POST /login", handleLogin(client))

	log.Println("rpc-gateway listening on :8086")
	if err := http.ListenAndServe(":8086", logMiddleware(mux)); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func handleRegister(client pb.StakeholdersServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Email    string `json:"email"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid request body"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.Register(ctx, &pb.RegisterRequest{
			Username: body.Username,
			Password: body.Password,
			Email:    body.Email,
			Role:     body.Role,
		})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			code := 400
			if strings.Contains(resp.Error, "already taken") {
				code = 409
			}
			writeJSON(w, code, map[string]string{"error": resp.Error})
			return
		}

		writeJSON(w, 201, map[string]any{
			"id":         resp.Id,
			"username":   resp.Username,
			"email":      resp.Email,
			"role":       resp.Role,
			"is_blocked": resp.IsBlocked,
		})
	}
}

func handleLogin(client pb.StakeholdersServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid request body"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.Login(ctx, &pb.LoginRequest{
			Username: body.Username,
			Password: body.Password,
		})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			code := 401
			if resp.Error == "account is blocked" {
				code = 403
			}
			writeJSON(w, code, map[string]string{"error": resp.Error})
			return
		}

		writeJSON(w, 200, map[string]any{
			"token": resp.Token,
			"account": map[string]any{
				"id":         resp.Id,
				"username":   resp.Username,
				"email":      resp.Email,
				"role":       resp.Role,
				"is_blocked": resp.IsBlocked,
			},
		})
	}
}

func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[rpc-gateway] %s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
