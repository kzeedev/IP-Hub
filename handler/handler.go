package handler

// Handler provides HTTP, OpenAPI, and Markdown presentation handlers.
type Handler struct {
	svc WhoisService
}

// New creates a new Handler with the given WhoisService.
func New(svc WhoisService) *Handler {
	if svc == nil {
		svc = NewWhoisService()
	}
	return &Handler{
		svc: svc,
	}
}

// Service returns the underlying WhoisService.
func (h *Handler) Service() WhoisService {
	return h.svc
}
