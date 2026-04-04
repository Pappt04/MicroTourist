package main

type Role string

const (
	RoleGuide         Role = "guide"
	RoleTourist       Role = "tourist"
	RoleAdministrator Role = "administrator"
)

type Account struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Role     Role   `json:"role"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Role     Role   `json:"role"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token   string  `json:"token"`
	Account Account `json:"account"`
}
