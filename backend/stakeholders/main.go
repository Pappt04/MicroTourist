package main

import (
	"log"
	"net/http"
	"time"
)

func main() {
	db, err := initDB()
	if err != nil {
		log.Fatalf("cannot connect to database: %v", err)
	}

	defer func() {
		err := db.Close()
		log.Fatalf("Cant close datbase connection with error %s", err)
	}()

	if err := migrate(db); err != nil {
		log.Fatalf("migration failed: %v", err)
	}
	log.Println("database migration OK")

	srv := &server{db: db}

	httpServer := &http.Server{
		Addr:         ":8080",
		Handler:      srv.routes(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Println("stakeholders service listening on :8080")
	if err := httpServer.ListenAndServe(); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
