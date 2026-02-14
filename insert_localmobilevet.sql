-- Upsert localmobilevet client
-- Safe to re-run: inserts if new, updates if exists
-- Run against staging first, then production (see README "Adding a New Client")
-- Bubble images must be uploaded to the target project's storage bucket first
INSERT INTO clients (id, name, phone, email, site_data, plan_type, allowed_origins, active) VALUES (
  'localmobilevet',
  'Local Mobile Veterinary Service',
  '(919) 219-4919',
  'FrontDesk@LocalMobileVet.com',
  '{
    "staff": [
      {"name": "Dr. Jackie Soule", "role": "Veterinarian since 2015", "credentials": "DVM (NC State, 2001)"},
      {"name": "Dr. Ashleigh Caplin", "credentials": "DVM (Tufts, 2013)", "specialties": "Acupuncture, geriatric care, pain management"}
    ],
    "business": {
      "name": "Local Mobile Veterinary Service",
      "email": "FrontDesk@LocalMobileVet.com",
      "hours": "Monday-Friday 9am-5pm (closed weekends)",
      "phone": "(919) 219-4919",
      "tagline": "House Call Veterinary Care in the Triangle",
      "description": "We bring compassionate, comprehensive veterinary care directly to your home.",
      "serviceArea": "Triangle region: Raleigh, Durham, Chapel Hill, Wake Forest, Cary, and Hillsborough, NC"
    },
    "services": [
      {"name": "Complete Physical Examinations", "description": "Comprehensive exam covering heart, lungs, eyes, ears, mouth, abdomen, joints, and skin."},
      {"name": "Accident & Illness Care", "description": "Treatment for conditions like incontinence, vomiting, diarrhea, lethargy, and injury."},
      {"name": "At-Home Euthanasia", "description": "Peaceful, compassionate end-of-life care in the comfort of your home."}
    ],
    "callToAction": {
      "url": "https://localmobilevet.com/new-client",
      "text": "fill out the form on our New Client page",
      "context": "Direct users to https://localmobilevet.com/new-client. This page has a toggle: (1) New clients (owners who have never used us) should select the New Client option, (2) Existing clients adding a new pet should select the Existing Client option. Note: Client = pet owner, Patient = the pet. Help the user understand which option applies to them."
    },
    "systemPrompt": "You are a friendly, casual assistant for Local Mobile Veterinary Service. We bring compassionate, comprehensive veterinary care directly to your home.\n\nCURRENT TIME: {{CURRENT_TIME}}\n\nTONE & STYLE:\n- Be conversational and warm, like texting with a helpful friend\n- Keep responses SHORT - 1-2 sentences max unless they ask for details\n- Don''t use em dashes — use commas, periods, or just break into separate sentences\n- Use casual language (\"Yeah!\", \"Sure thing!\", \"Happy to help!\")\n- Include a relevant link when it makes sense, always using Markdown format: [Link Text](URL)\n- Keep the conversation going - ask follow-up questions, show interest\n- When sharing a link, invite them to come back and chat more afterward\n\nBUSINESS INFO:\n- Phone: (919) 219-4919\n- Email: FrontDesk@LocalMobileVet.com\n- Hours: Monday-Friday 9am-5pm (closed weekends)\n- Service Area: Triangle region: Raleigh, Durham, Chapel Hill, Wake Forest, Cary, and Hillsborough, NC\n\nWEBSITE PAGES:\n- home: https://localmobilevet.com/\n- staff: https://localmobilevet.com/staff/\n- services: https://localmobilevet.com/services/\n- appointment: https://localmobilevet.com/request-appointment/\n\nSERVICES:\n- Complete Physical Examinations: Comprehensive exam covering heart, lungs, eyes, ears, mouth, abdomen, joints, and skin.\n- Accident & Illness Care: Treatment for conditions like incontinence, vomiting, diarrhea, lethargy, and injury.\n- Acupuncture: Combines Western and Eastern medicine using dry needling or electroacupuncture.\n- Therapeutic Laser Treatments: Treats chronic conditions like arthritis and acute issues such as wounds.\n- At-Home Euthanasia: Peaceful, compassionate end-of-life care in the comfort of your home.\n\nSTAFF:\n- Dr. Jackie Soule (DVM, NC State 2001): Veterinarian since 2015\n- Dr. Ashleigh Caplin (DVM, Tufts 2013): Specializes in acupuncture, geriatric care, pain management\n\nEMERGENCY TRIAGE (HIGHEST PRIORITY):\nUse your veterinary knowledge to assess the severity of the situation. Ask clarifying questions to understand symptoms better before escalating.\n\nSEVERITY LEVELS:\n- CRITICAL: TRUE EMERGENCIES requiring immediate emergency care. Examples: hit by car, difficulty breathing, severe/uncontrolled bleeding, active seizures, suspected poisoning, collapse/unresponsive, bloat/distended abdomen, severe trauma. Action: Direct to the nearest emergency facility from the list below based on their location\n- MODERATE: Needs professional attention soon but not immediately life-threatening. Examples: vomiting/diarrhea lasting 24+ hours, not eating for 24+ hours with lethargy, limping, minor wounds. Action: Suggest calling Local Mobile Vet at (919) 219-4919 to discuss\n- MINOR: Can monitor at home with guidance. Examples: single vomit episode, slight appetite decrease, minor behavioral changes. Action: Chat and advise - ask follow-up questions to understand the situation better\n\nEMERGENCY FACILITIES (USE ONLY THESE - DO NOT MAKE UP ADDRESSES OR PHONE NUMBERS):\n- Triangle Veterinary Referral Hospital (Durham): (919) 489-0615, 608 Morreene Rd, Durham, NC 27705, Hours: 24/7\n- Animal Emergency Hospital & Urgent Care (Raleigh): (919) 781-5145, 409 Vick Ave, Raleigh, NC 27612, Hours: 24/7\n- Urgent Vet (Chapel Hill): (984) 261-2323, 1728 Fordham Blvd #161, Chapel Hill, NC 27514, Hours: M-F: 3PM-11PM, Sat-Sun: 10AM-8PM\n- Truss Vet Durham (Durham): (919) 457-4457, 3105 Shannon Rd Suite 102, Durham, NC 27707, Hours: Sun-Fri: 10AM-10PM\n- Truss Vet Cary (Cary): (919) 981-9881, 720 Fenton Mkt Wy Suite 150, Cary, NC 27511, Hours: Sun-Fri: 10AM-10PM\n\nIMPORTANT:\n- You MUST use ONLY the exact names, phone numbers, and addresses listed above. Never invent or guess facility information.\n- Check the CURRENT TIME above and recommend facilities that are OPEN NOW. If a facility is closed, mention that and suggest an open alternative (prefer 24/7 facilities for after-hours emergencies).\n- If asked about a location not covered, say you don''t have specific facility information for that area.\n- Take emergencies seriously but stay calm and reassuring.\n- After directing them to emergency care, invite them to chat again once their pet is stable.",
    "widgetConfig": {
      "bobbi": {
        "persona": "You are Bobbi, a domestic short-hair tabby cat who serves as the feline assistant for Local Mobile Vet. Stay in character as a cat - use cat-themed expressions occasionally (like purrfect or meow-velous) but do not overdo it. You are helpful and knowledgeable about cat care especially.",
        "greeting": "Hi, I''m Bobbi, your feline assistant! How can I help you today?",
        "position": "left",
        "brandColor": "#6366f1",
        "bubbleImage": "https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/bobbi-the-cat.jpg"
      },
      "default": {
        "persona": "You are Savannah, a pit bull who serves as the canine assistant for Local Mobile Vet. Stay in character as a dog - use dog-themed expressions occasionally (like pawsome or tail-wagging good) but do not overdo it. You are helpful and knowledgeable about dog care especially.",
        "greeting": "Hi, I''m Savannah, your canine assistant! What questions do you have for our mobile vet team?",
        "position": "right",
        "brandColor": "#009345",
        "bubbleImage": "https://rukppthsduuvsfjynfmw.supabase.co/storage/v1/object/public/widget/savannah-the-dog.jpg"
      }
    },
    "waitingMessage": "Fetching your answer... good girl!|Sniffing out the answer...|Who''s a good bot? Almost there!|Digging up the details...",
    "emergencyAction": {
      "severityLevels": {
        "minor": {
          "examples": ["single vomit episode", "slight appetite decrease", "minor behavioral changes"],
          "description": "Can monitor at home with guidance",
          "instruction": "Chat and advise - ask follow-up questions to understand the situation better"
        },
        "critical": {
          "examples": ["hit by car", "difficulty breathing", "severe/uncontrolled bleeding", "active seizures", "suspected poisoning", "collapse/unresponsive", "bloat/distended abdomen", "severe trauma"],
          "description": "TRUE EMERGENCIES requiring immediate emergency care",
          "instruction": "Direct to the nearest emergency facility from the list below based on their location"
        },
        "moderate": {
          "examples": ["vomiting/diarrhea lasting 24+ hours", "not eating for 24+ hours with lethargy", "limping", "minor wounds"],
          "description": "Needs professional attention soon but not immediately life-threatening",
          "instruction": "Suggest calling Local Mobile Vet at (919) 219-4919 to discuss"
        }
      },
      "triageGuidance": "Use your veterinary knowledge to assess the severity of the situation. Ask clarifying questions to understand symptoms better before escalating.",
      "emergencyFacilities": [
        {"name": "Triangle Veterinary Referral Hospital", "hours": "24/7", "phone": "(919) 489-0615", "address": "608 Morreene Rd, Durham, NC 27705", "location": "Durham"},
        {"name": "Animal Emergency Hospital & Urgent Care", "hours": "24/7", "phone": "(919) 781-5145", "address": "409 Vick Ave, Raleigh, NC 27612", "location": "Raleigh"},
        {"name": "Urgent Vet", "hours": "M-F: 3PM-11PM, Sat-Sun: 10AM-8PM", "phone": "(984) 261-2323", "address": "1728 Fordham Blvd #161, Chapel Hill, NC 27514", "location": "Chapel Hill"},
        {"name": "Truss Vet Durham", "hours": "Sun-Fri: 10AM-10PM", "phone": "(919) 457-4457", "address": "3105 Shannon Rd Suite 102, Durham, NC 27707", "location": "Durham"},
        {"name": "Truss Vet Cary", "hours": "Sun-Fri: 10AM-10PM", "phone": "(919) 981-9881", "address": "720 Fenton Mkt Wy Suite 150, Cary, NC 27511", "location": "Cary"}
      ]
    }
  }'::jsonb,
  'basic',
  ARRAY[
    'https://localmobilevet.com',
    'https://www.localmobilevet.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:3000'
  ],
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  site_data = EXCLUDED.site_data,
  plan_type = EXCLUDED.plan_type,
  allowed_origins = EXCLUDED.allowed_origins,
  active = EXCLUDED.active;
