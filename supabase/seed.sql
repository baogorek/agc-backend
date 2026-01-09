INSERT INTO clients (id, name, phone, email, site_data, plan_type) VALUES (
  'localmobilevet',
  'Local Mobile Veterinary Service',
  '(919) 219-4919',
  'FrontDesk@LocalMobileVet.com',
  '{
    "business": {
      "name": "Local Mobile Veterinary Service",
      "tagline": "House Call Veterinary Care in the Triangle",
      "description": "We bring compassionate, comprehensive veterinary care directly to your home.",
      "phone": "(919) 219-4919",
      "email": "FrontDesk@LocalMobileVet.com",
      "hours": "Monday-Friday 9am-5pm (closed weekends)",
      "serviceArea": "Triangle region: Raleigh, Durham, Chapel Hill, Wake Forest, Cary, and Hillsborough, NC"
    },
    "pages": {
      "home": "https://localmobilevet.com/",
      "services": "https://localmobilevet.com/services/",
      "staff": "https://localmobilevet.com/staff/",
      "appointment": "https://localmobilevet.com/request-appointment/"
    },
    "services": [
      {"name": "Complete Physical Examinations", "description": "Comprehensive exam covering heart, lungs, eyes, ears, mouth, abdomen, joints, and skin."},
      {"name": "Accident & Illness Care", "description": "Treatment for conditions like incontinence, vomiting, diarrhea, lethargy, and injury."},
      {"name": "Acupuncture", "description": "Combines Western and Eastern medicine using dry needling or electroacupuncture."},
      {"name": "Therapeutic Laser Treatments", "description": "Treats chronic conditions like arthritis and acute issues such as wounds."},
      {"name": "At-Home Euthanasia", "description": "Peaceful, compassionate end-of-life care in the comfort of your home."}
    ],
    "staff": [
      {"name": "Dr. Jackie Soule", "credentials": "DVM (NC State, 2001)", "role": "Veterinarian since 2015"},
      {"name": "Dr. Ashleigh Caplin", "credentials": "DVM (Tufts, 2013)", "specialties": "Acupuncture, geriatric care, pain management"}
    ]
  }'::jsonb,
  'basic'
);
