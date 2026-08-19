package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/kzeedev/IP-Hub/database"
	"github.com/kzeedev/IP-Hub/pluginBase"
)

type FormRequest struct {
	Country   string `json:"country"`
	IPType    string `json:"version"`
	Format    string `json:"format"`
	Access    string `json:"access"`
	Turnstile string `json:"cf-turnstile-response"`
}

func handleRequest(c *fiber.Ctx) error {
	request := new(FormRequest)

	if err := c.BodyParser(request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if !ValidateCaptcha(request.Turnstile) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Captcha validation failed",
		})
	}

	// Create database connection
	db, err := database.New()
	if err != nil {
		log.Fatal(err)
	}
	info, err := db.GetOrSet(request.Country, func() (*pluginBase.Lookup, error) {
		result := lookup(request.Country)
		return &result, nil
	})
	defer db.Close()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	switch request.Format {
	case "json":
		return c.JSON(info)
	case "htaccess":
		access := "Deny"
		if request.Access == "allow" {
			access = "Allow"
		}
		switch request.IPType {
		case "ipv4":
			return c.SendString(fmt.Sprintf("%s from %v", access, arrayToString(info.IPv4)))
		case "ipv6":
			return c.SendString(fmt.Sprintf("%s from %v", access, arrayToString(info.IPv6)))
		default:
			return c.SendString(fmt.Sprintf("%s from %v\n%s from %v", access, arrayToString(info.IPv4), access, arrayToString(info.IPv6)))
		}
	default:
		for _, plugin := range plugins {
			if plugin.GetID() == request.Format {
				result := plugin.Format(*info, pluginBase.IPVersion(request.IPType), request.Access == "allow")
				return c.SendString(result)
			}
		}
		fmt.Println(`Can't find plugin with id: `, request.Format)
	}
	return c.JSON(info)
}
