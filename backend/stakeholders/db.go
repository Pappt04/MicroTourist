package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func initDB() (*sql.DB, error) {
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		getenv("DB_HOST", "localhost"),
		getenv("DB_PORT", "5432"),
		getenv("DB_USER", "postgres"),
		getenv("DB_PASSWORD", "postgres"),
		getenv("DB_NAME", "microtourist-stakeholders"),
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS accounts (
			id            SERIAL PRIMARY KEY,
			username      VARCHAR(50)  UNIQUE NOT NULL,
			email         VARCHAR(100) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
			role          VARCHAR(20)  NOT NULL
				CHECK (role IN ('guide', 'tourist', 'administrator'))
		)
	`)
	return err
}

func createAccount(db *sql.DB, username, email, passwordHash string, role Role) (*Account, error) {
	var a Account
	err := db.QueryRow(
		`INSERT INTO accounts (username, email, password_hash, role)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, username, email, role`,
		username, email, passwordHash, string(role),
	).Scan(&a.ID, &a.Username, &a.Email, &a.Role)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func getAccountByUsername(db *sql.DB, username string) (*Account, string, error) {
	var a Account
	var hash string
	err := db.QueryRow(
		`SELECT id, username, email, role, password_hash
		 FROM accounts WHERE username = $1`,
		username,
	).Scan(&a.ID, &a.Username, &a.Email, &a.Role, &hash)
	if err != nil {
		return nil, "", err
	}
	return &a, hash, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
