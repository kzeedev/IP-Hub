package models

type TurnstileResponse struct {
	Success     bool     `json:"success"`
	ErrorCodes  []string `json:"error-codes"`
	ChallengeTs string   `json:"challenge_ts"`
	Hostname    string   `json:"hostname"`
	Action      string   `json:"action,omitempty"`
	CData       string   `json:"cdata,omitempty"`
}
