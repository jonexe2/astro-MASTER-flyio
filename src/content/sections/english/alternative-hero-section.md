---
enable: true

eyebrow: "Reliable Heating & Cooling Solutions"
heading: "Trusted Heating & Cooling Services in Boston, MA"
headingAccent: "Boston, MA"
description: "Get help with HVAC repairs, installation, maintenance, and indoor air quality for your Boston-area home."

# Pexels photo 32497161 by Kathleen Austin Kuhn. The image is decorative,
# so its accessible alternative is intentionally empty.
backgroundImage: "/images/alternative-hero-hvac.jpg"
backgroundImageAlt: ""

trustBanner:
  googleReview:
    rating: "5.0 Rating"
    reviews: "200+ Reviews"
  licensedLabel: "Licensed & Insured"

checklist:
  - "Air Conditioning Repair"
  - "Heating Repair"
  - "HVAC Installation & Replacement"
  - "Preventive Maintenance & Indoor Air Quality"

button:
  # Refer to sharedButton in src/sections.schema.ts for all options.
  enable: true
  label: "Contact Us"
  url: "/#alternative-hero-form"
  variant: "fill"
  rel: ""
  target: ""
  class: "px-8 py-4"
  icon:
    enable: false
    name: "ArrowUpRight"
    position: "right"

form:
  title: "Get Your Free Estimate"
  description: "Tell us what you need and we'll your follow up with you."
  emailSubject: "New HVAC service request"
  trustNote: "100% Secure. Your info stays private."

  fields:
    fullNameLabel: "Full Name"
    phoneLabel: "Phone Number"
    emailLabel: "Email"
    servicesLabel: "Which service do you need?"
    servicesPlaceholder: "Select one or more services"

  services:
    - "AC Repair"
    - "Heating Repair"
    - "HVAC Installation"
    - "Preventive Maintenance"
    - "Indoor Air Quality"
    - "Emergency HVAC Service"

  submitButton:
    # Refer to sharedButton in src/sections.schema.ts for all options.
    enable: true
    tag: "button"
    label: "Get My Free Quote"
    variant: "fill"
    rel: ""
    target: ""
    class: "w-full justify-center px-8 py-4"
    icon:
      enable: false
      name: "ArrowUpRight"
      position: "right"

  messages:
    validation: "Please complete all required fields."
    servicesRequired: "Select at least one service."
    pending: "Submitting your service request..."
    success: "Thank you. Your service request has been received."
    error: "We couldn't submit your request. Please try again."
    unknownProvider: "The configured form provider is not available."
---
