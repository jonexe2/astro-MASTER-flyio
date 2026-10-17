---
enable: true # Control the visibility of this section across all pages where it is used
title: "Have Any Project on Your Mind?"
description: "Great! We're excited to hear from you and let's start something"
officeHours: "Office Hours: Mon - Sat: 8:00 AM - 10:00 PM" # Optional; remove or set empty to hide this row.

# The contact form sends HVAC service requests to the site's own backend
# (POST /api/leads/). Its fields must stay the V1 lead fields: fullName, phone,
# email and services (required) and message (optional). The build fails if any
# other field is listed here. Labels, placeholders and widths can be edited.
formTitle: "Fill The Contact Form"
formDescription: "Tell us what you need and our team will reply with useful next steps."

form:
  submitButton:
    # Refer to the `sharedButton` schema in `src/sections.schema.ts` for all available configuration options (e.g., enable, label, url, hoverEffect, variant, icon, tag, rel, class, target, etc.)
    enable: true
    label: "Send Message"
    class: "w-full justify-center rounded-md"
    hoverEffect: "magnetic-text-flip" # Optional: text-flip | creative-fill | magnetic | magnetic-text-flip
    # variant: "" # Optional: fill | outline | text | circle
    # rel: "" # Optional
    # target: "" # Optional

  # This note will show at the end of form
  # note: |
  #   Your data is safe with us. We respect your privacy and never share your information. <br /> Read our [Privacy Policy](/privacy-policy/).

  messages:
    validation: "Please check the highlighted fields and try again."
    servicesRequired: "Select at least one service."
    rateLimited: "Too many requests. Please wait a few minutes and try again."

  inputs:
    - label: "Full name"
      name: "fullName"
      placeholder: "Full name"
      type: "text"
      required: true
    - label: "Phone number"
      name: "phone"
      placeholder: "Phone number"
      type: "tel"
      required: true
      halfWidth: true
    - label: "Email address"
      name: "email"
      placeholder: "Email address"
      type: "email"
      required: true
      halfWidth: true
    - label: "HVAC services"
      name: "services"
      placeholder: "Select one or more services"
      type: "services" # Options come from HVAC_SERVICES in src/lib/leads/contract.ts
      required: true
    - label: "Message"
      name: "message"
      placeholder: "Tell us about your heating or cooling issue (optional)"
      tag: "textarea"
      rows: "5"
    - note: success
      parentClass: "hidden text-sm message success"
      content: "Thank you. We received your request and will reply with useful next steps."
    - note: deprecated
      parentClass: "hidden text-sm message error"
      content: "Something went wrong. Please try again or contact us directly."
---
