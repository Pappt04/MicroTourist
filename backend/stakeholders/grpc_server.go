package main

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net"

	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	pb "microtourist/stakeholders/pb"
)

type grpcStakeholdersServer struct {
	pb.UnimplementedStakeholdersServiceServer
	db *sql.DB
}

func (s *grpcStakeholdersServer) Register(_ context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	role := Role(req.Role)
	if role != RoleGuide && role != RoleTourist {
		return &pb.RegisterResponse{Error: "role must be 'guide' or 'tourist'"}, nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return &pb.RegisterResponse{Error: "could not hash password"}, nil
	}

	account, err := createAccount(s.db, req.Username, req.Email, string(hash), role)
	if err != nil {
		if isUniqueViolation(err) {
			return &pb.RegisterResponse{Error: "username or email already taken"}, nil
		}
		return &pb.RegisterResponse{Error: "could not create account"}, nil
	}

	return &pb.RegisterResponse{
		Id:        int64(account.ID),
		Username:  account.Username,
		Email:     account.Email,
		Role:      string(account.Role),
		IsBlocked: account.IsBlocked,
	}, nil
}

func (s *grpcStakeholdersServer) Login(_ context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	account, hash, err := getAccountByUsername(s.db, req.Username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &pb.LoginResponse{Error: "invalid credentials"}, nil
		}
		return &pb.LoginResponse{Error: "could not fetch account"}, nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		return &pb.LoginResponse{Error: "invalid credentials"}, nil
	}

	if account.IsBlocked {
		return &pb.LoginResponse{Error: "account is blocked"}, nil
	}

	token, err := generateToken(account)
	if err != nil {
		return &pb.LoginResponse{Error: "could not generate token"}, nil
	}

	return &pb.LoginResponse{
		Token:     token,
		Id:        int64(account.ID),
		Username:  account.Username,
		Email:     account.Email,
		Role:      string(account.Role),
		IsBlocked: account.IsBlocked,
	}, nil
}

func (s *grpcStakeholdersServer) GetProfile(_ context.Context, req *pb.GetProfileRequest) (*pb.ProfileResponse, error) {
	profile, err := getProfileByAccountID(s.db, int(req.AccountId))
	if err != nil {
		return &pb.ProfileResponse{Error: "could not fetch profile"}, nil
	}
	return &pb.ProfileResponse{
		AccountId:      int64(profile.AccountID),
		FirstName:      profile.FirstName,
		LastName:       profile.LastName,
		ProfilePicture: profile.ProfilePicture,
		Bio:            profile.Bio,
		Motto:          profile.Motto,
	}, nil
}

func (s *grpcStakeholdersServer) GetAllAccounts(_ context.Context, _ *pb.GetAllAccountsRequest) (*pb.GetAllAccountsResponse, error) {
	accounts, err := getAllAccounts(s.db)
	if err != nil {
		return &pb.GetAllAccountsResponse{Error: "could not fetch accounts"}, nil
	}
	msgs := make([]*pb.AccountMessage, 0, len(accounts))
	for _, a := range accounts {
		msgs = append(msgs, &pb.AccountMessage{
			Id:        int64(a.ID),
			Username:  a.Username,
			Email:     a.Email,
			Role:      string(a.Role),
			IsBlocked: a.IsBlocked,
		})
	}
	return &pb.GetAllAccountsResponse{Accounts: msgs}, nil
}

func startGRPCServer(db *sql.DB) {
	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("gRPC: failed to listen: %v", err)
	}
	srv := grpc.NewServer()
	pb.RegisterStakeholdersServiceServer(srv, &grpcStakeholdersServer{db: db})
	log.Println("gRPC server listening on :9090")
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("gRPC serve error: %v", err)
	}
}
