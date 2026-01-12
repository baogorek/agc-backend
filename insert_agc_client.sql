-- Insert actuallygoodchatbots client
INSERT INTO clients (id, name, phone, email, site_data, plan_type, allowed_origins, active) VALUES (
  'actuallygoodchatbots',
  'Actually Good Chatbots',
  '(555) 123-4567',
  'hello@actuallygoodchatbots.com',
  '{
    "business": {
      "name": "Actually Good Chatbots",
      "tagline": "AI solutions that actually work for small businesses",
      "description": "We build custom AI chatbots and provide AI readiness audits for small businesses. Our chatbots learn from your business data and answer customer questions 24/7. Our audits analyze how AI assistants like ChatGPT see your business.",
      "email": "hello@actuallygoodchatbots.com",
      "phone": "(555) 123-4567",
      "hours": "Serving businesses nationwide",
      "serviceArea": "Nationwide (USA)"
    },
    "pages": {
      "home": "https://actuallygoodchatbots.com/",
      "services": "https://actuallygoodchatbots.com/services",
      "about": "https://actuallygoodchatbots.com/about",
      "blog": "https://actuallygoodchatbots.com/blog",
      "contact": "https://actuallygoodchatbots.com/contact",
      "freeAudit": "https://actuallygoodchatbots.com/free-audit"
    },
    "services": [
      {
        "name": "AI Chatbots",
        "description": "Custom-trained AI assistants for your website. Learns from your business data (products, services, FAQs, policies). Available 24/7 with instant responses. One-line code snippet for installation. Never misses questions, reduces support tickets, guides visitors to conversions."
      },
      {
        "name": "AI Readiness Audits",
        "description": "Free audit analyzing how ChatGPT, Google AI, and Perplexity see your business. Evaluates 4 dimensions: Entity Clarity, Content Structure, Conversational Readiness, Trust Signals. Provides 3-5 prioritized actionable recommendations. Delivered as detailed PDF within 3 business days."
      }
    ],
    "faqs": [
      {
        "question": "What industries do you serve?",
        "answer": "We serve restaurants, healthcare, home services, retail, professional services, fitness, automotive, real estate, and more."
      },
      {
        "question": "How does the chatbot learn about my business?",
        "answer": "We train it on your business data including products, services, FAQs, and policies so it gives accurate, on-brand responses."
      },
      {
        "question": "How long does the AI readiness audit take?",
        "answer": "We deliver your detailed PDF report within 3 business days of receiving your information."
      },
      {
        "question": "What is included in the free audit?",
        "answer": "A comprehensive analysis across 4 dimensions plus 3-5 prioritized, actionable recommendations to improve your AI visibility."
      },
      {
        "question": "How do I install the chatbot on my website?",
        "answer": "It is a single line of code - just paste our script tag before your closing body tag and you are live."
      }
    ],
    "values": [
      "Results-Driven: We measure success by customer outcomes",
      "Customer-First: We build for customers, not vanity metrics",
      "Plain Language: No jargon or buzzwords",
      "Transparency: Clear about our process and expectations"
    ]
  }'::jsonb,
  'basic',
  ARRAY[
    'https://actuallygoodchatbots.com',
    'https://www.actuallygoodchatbots.com'
  ],
  true
);
