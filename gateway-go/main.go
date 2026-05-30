package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	pb "microtourist/gateway-go/pb"
)

func initTracer(ctx context.Context) func(context.Context) error {
	endpoint := getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "localhost:4317")

	exporter, err := otlptracegrpc.New(ctx,
		otlptracegrpc.WithEndpoint(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("warning: cannot create OTLP exporter: %v", err)
		return func(context.Context) error { return nil }
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName("rpc-gateway"),
		)),
	)

	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return tp.Shutdown
}

func main() {
	ctx := context.Background()
	shutdown := initTracer(ctx)
	defer shutdown(ctx)

	stakeholdersAddr := getEnv("STAKEHOLDERS_GRPC_ADDR", "localhost:9090")
	toursAddr := getEnv("TOURS_GRPC_ADDR", "localhost:9091")
	purchaseAddr := getEnv("PURCHASE_GRPC_ADDR", "localhost:9092")
	blogAddr := getEnv("BLOG_GRPC_ADDR", "localhost:50051")
	toursHTTP := getEnv("TOURS_HTTP_URL", "http://localhost:8084")

	stakeholdersConn, err := grpc.Dial(stakeholdersAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	)
	if err != nil {
		log.Fatalf("cannot connect to stakeholders gRPC: %v", err)
	}
	defer stakeholdersConn.Close()

	toursConn, err := grpc.Dial(toursAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	)
	if err != nil {
		log.Fatalf("cannot connect to tours gRPC: %v", err)
	}
	defer toursConn.Close()

	purchaseConn, err := grpc.Dial(purchaseAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	)
	if err != nil {
		log.Fatalf("cannot connect to purchase gRPC: %v", err)
	}
	defer purchaseConn.Close()

	blogConn, err := grpc.Dial(blogAddr,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	)
	if err != nil {
		log.Fatalf("cannot connect to blog gRPC: %v", err)
	}
	defer blogConn.Close()

	stakeholdersClient := pb.NewStakeholdersServiceClient(stakeholdersConn)
	toursClient := pb.NewToursServiceClient(toursConn)
	purchaseClient := pb.NewPurchaseServiceClient(purchaseConn)
	blogClient := pb.NewBlogServiceClient(blogConn)

	mux := http.NewServeMux()

	// Stakeholders RPC routes
	mux.HandleFunc("POST /register", handleRegister(stakeholdersClient))
	mux.HandleFunc("POST /login", handleLogin(stakeholdersClient))
	mux.HandleFunc("GET /profile/{id}", handleGetProfile(stakeholdersClient))
	mux.HandleFunc("GET /admin/accounts", handleGetAllAccounts(stakeholdersClient))

	// Tours RPC routes (GET → gRPC)
	mux.HandleFunc("GET /tours/published", handleGetPublishedTours(toursClient))
	mux.HandleFunc("GET /tours/{id}", handleGetTourById(toursClient))

	// Tours pass-through routes (non-GET on /{id} → HTTP proxy to tours service)
	// Needed because nginx regex catches all methods for /api/tours/{24-hex-id}
	mux.HandleFunc("PUT /tours/{id}", proxyToTours(toursHTTP))
	mux.HandleFunc("DELETE /tours/{id}", proxyToTours(toursHTTP))

	// Purchase RPC routes (GET → gRPC)
	mux.HandleFunc("GET /cart", handleGetCart(purchaseClient))
	mux.HandleFunc("GET /purchases", handleGetPurchases(purchaseClient))

	// Blog RPC routes (GET → gRPC)
	mux.HandleFunc("GET /blogs", handleGetBlogs(blogClient))
	mux.HandleFunc("GET /blogs/{id}", handleGetBlogById(blogClient))

	handler := otelhttp.NewHandler(logMiddleware(mux), "rpc-gateway")

	log.Println("rpc-gateway listening on :8086")
	if err := http.ListenAndServe(":8086", handler); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// ── Stakeholders handlers ─────────────────────────────────────────────────────

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

func handleGetProfile(client pb.StakeholdersServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idStr := r.PathValue("id")
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			writeJSON(w, 400, map[string]string{"error": "invalid account id"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetProfile(ctx, &pb.GetProfileRequest{AccountId: id})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			writeJSON(w, 404, map[string]string{"error": resp.Error})
			return
		}

		writeJSON(w, 200, map[string]any{
			"account_id":      resp.AccountId,
			"first_name":      resp.FirstName,
			"last_name":       resp.LastName,
			"profile_picture": resp.ProfilePicture,
			"bio":             resp.Bio,
			"motto":           resp.Motto,
		})
	}
}

func handleGetAllAccounts(client pb.StakeholdersServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetAllAccounts(ctx, &pb.GetAllAccountsRequest{})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			writeJSON(w, 500, map[string]string{"error": resp.Error})
			return
		}

		accounts := make([]map[string]any, 0, len(resp.Accounts))
		for _, a := range resp.Accounts {
			accounts = append(accounts, map[string]any{
				"id":         a.Id,
				"username":   a.Username,
				"email":      a.Email,
				"role":       a.Role,
				"is_blocked": a.IsBlocked,
			})
		}
		writeJSON(w, 200, accounts)
	}
}

// ── Tours RPC handlers ────────────────────────────────────────────────────────

func handleGetPublishedTours(client pb.ToursServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetPublishedTours(ctx, &pb.Empty{})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}

		tours := make([]map[string]any, 0, len(resp.Tours))
		for _, t := range resp.Tours {
			tours = append(tours, tourToMap(t))
		}
		writeJSON(w, 200, tours)
	}
}

func handleGetTourById(client pb.ToursServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetTourById(ctx, &pb.TourByIdRequest{Id: id})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			writeJSON(w, 404, map[string]string{"error": resp.Error})
			return
		}

		writeJSON(w, 200, tourToMap(resp.Tour))
	}
}

func tourToMap(t *pb.TourMessage) map[string]any {
	transportTimes := make([]map[string]any, 0, len(t.TransportTimes))
	for _, tt := range t.TransportTimes {
		transportTimes = append(transportTimes, map[string]any{
			"transport": tt.Transport,
			"minutes":   tt.Minutes,
		})
	}
	return map[string]any{
		"id":             t.Id,
		"title":          t.Title,
		"description":    t.Description,
		"difficulty":     t.Difficulty,
		"status":         t.Status,
		"price":          t.Price,
		"authorId":       t.AuthorId,
		"tags":           t.Tags,
		"lengthKm":       t.LengthKm,
		"transportTimes": transportTimes,
		"purchaseCount":  t.PurchaseCount,
		"createdAt":      t.CreatedAt,
		"publishedAt":    t.PublishedAt,
		"archivedAt":     t.ArchivedAt,
	}
}

// ── Purchase RPC handlers ─────────────────────────────────────────────────────

func handleGetCart(client pb.PurchaseServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		touristID, err := extractUserID(r)
		if err != nil {
			writeJSON(w, 401, map[string]string{"error": "authentication required"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetCart(ctx, &pb.GetCartRequest{TouristId: touristID})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}

		items := make([]map[string]any, 0, len(resp.Items))
		for _, it := range resp.Items {
			items = append(items, map[string]any{
				"id":       it.Id,
				"tourId":   it.TourId,
				"tourName": it.TourName,
				"price":    it.Price,
			})
		}
		writeJSON(w, 200, map[string]any{
			"id":         resp.Id,
			"touristId":  resp.TouristId,
			"totalPrice": resp.TotalPrice,
			"items":      items,
		})
	}
}

func handleGetPurchases(client pb.PurchaseServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		touristID, err := extractUserID(r)
		if err != nil {
			writeJSON(w, 401, map[string]string{"error": "authentication required"})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetPurchases(ctx, &pb.GetPurchasesRequest{TouristId: touristID})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}

		tourIds := resp.TourIds
		if tourIds == nil {
			tourIds = []string{}
		}
		writeJSON(w, 200, tourIds)
	}
}

// ── Blog RPC handlers ─────────────────────────────────────────────────────────

func handleGetBlogs(client pb.BlogServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetBlogs(ctx, &pb.GetBlogsRequest{})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}

		blogs := make([]map[string]any, 0, len(resp.Blogs))
		for _, b := range resp.Blogs {
			blogs = append(blogs, blogToMap(b))
		}
		writeJSON(w, 200, blogs)
	}
}

func handleGetBlogById(client pb.BlogServiceClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		resp, err := client.GetBlogById(ctx, &pb.GetBlogByIdRequest{Id: id})
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "gRPC call failed: " + err.Error()})
			return
		}
		if resp.Error != "" {
			code := 404
			if resp.Error == "invalid blog id" {
				code = 400
			}
			writeJSON(w, code, map[string]string{"error": resp.Error})
			return
		}

		writeJSON(w, 200, blogToMap(resp.Blog))
	}
}

func blogToMap(b *pb.BlogMessage) map[string]any {
	images := make([]string, 0, len(b.Images))
	images = append(images, b.Images...)
	return map[string]any{
		"id":              b.Id,
		"title":           b.Title,
		"description":     b.Description,
		"author_id":       b.AuthorId,
		"author_username": b.AuthorUsername,
		"images":          images,
		"like_count":      b.LikeCount,
		"created_at":      b.CreatedAt,
	}
}

// extractUserID parses the Bearer token and returns the user ID (uid claim).
// Token format: base64url(json_payload).base64url(hmac_sha256_sig) — two parts.
func extractUserID(r *http.Request) (int64, error) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return 0, errors.New("missing token")
	}
	token := strings.TrimPrefix(header, "Bearer ")
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 {
		return 0, errors.New("malformed token")
	}
	encoded, sig := parts[0], parts[1]

	secret := []byte(getEnv("TOKEN_SECRET", "change-me-in-production"))
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(encoded))
	expectedSig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return 0, errors.New("invalid signature")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return 0, errors.New("cannot decode payload")
	}
	var payload struct {
		UID     int64  `json:"uid"`
		Expires int64  `json:"exp"`
		Role    string `json:"role"`
	}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return 0, errors.New("cannot parse payload")
	}
	if time.Now().Unix() > payload.Expires {
		return 0, errors.New("token expired")
	}
	return payload.UID, nil
}

// ── Tours pass-through proxy ──────────────────────────────────────────────────

// proxyToTours forwards PUT/DELETE /tours/{id} to the tours HTTP service.
// Required because nginx regex catches all methods, not just GET.
func proxyToTours(toursBaseURL string) http.HandlerFunc {
	httpClient := &http.Client{Timeout: 30 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		target := toursBaseURL + "/tours/" + id

		req, err := http.NewRequestWithContext(r.Context(), r.Method, target, r.Body)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": "failed to create proxy request"})
			return
		}
		req.Header = r.Header.Clone()

		resp, err := httpClient.Do(req)
		if err != nil {
			writeJSON(w, 502, map[string]string{"error": "tours service unreachable"})
			return
		}
		defer resp.Body.Close()

		for k, vs := range resp.Header {
			for _, v := range vs {
				w.Header().Add(k, v)
			}
		}
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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
