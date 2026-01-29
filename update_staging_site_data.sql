-- Update localmobilevet site_data with widgetConfig and new emergencyAction structure

UPDATE clients
SET site_data = jsonb_set(
  site_data,
  '{widgetConfig}',
  '{
    "default": {
      "bubbleImage": "https://wbgdpxogtpqijkqyaeke.supabase.co/storage/v1/object/public/widget/savannah-the-dog.jpg",
      "brandColor": "#009345",
      "greeting": "Hi, I''m Savannah, your canine assistant! What questions do you have for our mobile vet team?",
      "persona": "You are Savannah, a pit bull who serves as the canine assistant for Local Mobile Vet. Stay in character as a dog - use dog-themed expressions occasionally (like pawsome or tail-wagging good) but do not overdo it. You are helpful and knowledgeable about dog care especially.",
      "position": "right"
    },
    "bobbi": {
      "bubbleImage": "https://wbgdpxogtpqijkqyaeke.supabase.co/storage/v1/object/public/widget/bobbi-the-cat.jpg",
      "brandColor": "#6366f1",
      "greeting": "Hi, I''m Bobbi, your feline assistant! How can I help you today?",
      "persona": "You are Bobbi, a domestic short-hair tabby cat who serves as the feline assistant for Local Mobile Vet. Stay in character as a cat - use cat-themed expressions occasionally (like purrfect or meow-velous) but do not overdo it. You are helpful and knowledgeable about cat care especially.",
      "position": "left"
    }
  }'::jsonb
)
WHERE id = 'localmobilevet';

-- Update emergencyAction with structured facilities
UPDATE clients
SET site_data = jsonb_set(
  site_data,
  '{emergencyAction}',
  '{
    "triageGuidance": "Use your veterinary knowledge to assess the severity of the situation. Ask clarifying questions to understand symptoms better before escalating.",
    "severityLevels": {
      "critical": {
        "description": "TRUE EMERGENCIES requiring immediate emergency care",
        "examples": ["hit by car", "difficulty breathing", "severe/uncontrolled bleeding", "active seizures", "suspected poisoning", "collapse/unresponsive", "bloat/distended abdomen", "severe trauma"],
        "instruction": "Direct to the nearest emergency facility from the list below based on their location"
      },
      "moderate": {
        "description": "Needs professional attention soon but not immediately life-threatening",
        "examples": ["vomiting/diarrhea lasting 24+ hours", "not eating for 24+ hours with lethargy", "limping", "minor wounds"],
        "instruction": "Suggest calling Local Mobile Vet at (919) 219-4919 to discuss"
      },
      "minor": {
        "description": "Can monitor at home with guidance",
        "examples": ["single vomit episode", "slight appetite decrease", "minor behavioral changes"],
        "instruction": "Chat and advise - ask follow-up questions to understand the situation better"
      }
    },
    "emergencyFacilities": [
      {
        "name": "Triangle Veterinary Referral Hospital",
        "location": "Durham",
        "phone": "(919) 489-0615",
        "address": "608 Morreene Rd, Durham, NC 27705",
        "hours": "24/7"
      },
      {
        "name": "Animal Emergency Hospital & Urgent Care",
        "location": "Raleigh",
        "phone": "(919) 781-5145",
        "address": "409 Vick Ave, Raleigh, NC 27612",
        "hours": "24/7"
      },
      {
        "name": "Urgent Vet",
        "location": "Chapel Hill",
        "phone": "(984) 261-2323",
        "address": "1728 Fordham Blvd #161, Chapel Hill, NC 27514",
        "hours": "M-F: 3PM-11PM, Sat-Sun: 10AM-8PM"
      },
      {
        "name": "Truss Vet Durham",
        "location": "Durham",
        "phone": "(919) 457-4457",
        "address": "3105 Shannon Rd Suite 102, Durham, NC 27707",
        "hours": "Sun-Fri: 10AM-10PM"
      },
      {
        "name": "Truss Vet Cary",
        "location": "Cary",
        "phone": "(919) 981-9881",
        "address": "720 Fenton Mkt Wy Suite 150, Cary, NC 27511",
        "hours": "Sun-Fri: 10AM-10PM"
      }
    ]
  }'::jsonb
)
WHERE id = 'localmobilevet';

-- Verify the update
SELECT id,
       site_data->'widgetConfig'->'default'->>'greeting' as default_greeting,
       site_data->'widgetConfig'->'bobbi'->>'greeting' as bobbi_greeting,
       jsonb_array_length(site_data->'emergencyAction'->'emergencyFacilities') as facility_count
FROM clients
WHERE id = 'localmobilevet';
