# Varanasi Sports Live — आसान तरीका

## सबसे जरूरी बात

आपके ग्राहक/दोस्त को ZIP, Node.js, CMD या कोई server चलाने की जरूरत नहीं होगी।

एक बार website को online hosting पर डालने के बाद उसे सिर्फ एक link मिलेगा:

    https://आपका-domain.com

बस यही link WhatsApp पर भेजना है।

## आपके लिए दो तरीके

### तरीका 1 — असली Online Website (Recommended)

इस पूरे `vsl-secure` folder को Node.js hosting पर एक बार deploy करें।

Deployment के बाद:

1. Website URL खोलें.
2. Admin Login पर जाएँ.
3. ID: `admin`
4. Password: `T@smiya1`
5. Events, Gallery, Rates और Main Image बदलें.
6. Clients को सिर्फ website URL भेजें.

### तरीका 2 — अपने Windows computer पर अस्थायी रूप से चलाना

`START-WEBSITE-WINDOWS.bat` पर double-click करें.

यह local website खोल देगा:

    http://localhost:3000

लेकिन यह public website नहीं है. आपका computer बंद होगा तो website भी बंद होगी.

## WhatsApp Query

Business WhatsApp: `9506117861`

Client Phone Number enquiry में mandatory है.

## Email Query

Admin Settings में अपना वास्तविक business email डालें.

ध्यान दें: इस starter version में email button visitor के mail application को खोलता है. अगर आपको server से automatic email भेजना है, तो SMTP/email provider जोड़ना होगा.

## Security

Admin password source code में plain text में नहीं रखा गया है; authentication server-side है.

Production में:
- HTTPS जरूर रखें.
- `.env` को public न करें.
- Admin password किसी को न दें.
- Hosting पर environment variable/secret के रूप में password hash रखें.

## एक महत्वपूर्ण सीमा

इस project में website data अभी JSON file में है. कुछ hosting platforms restart/deploy पर local files reset कर सकते हैं.

अगर आप रोज अपने फोन से Events/Gallery/Rates बदलेंगे, तो production version में database (Supabase/Firebase/managed DB) लगाना बेहतर है.

इसलिए यह package deployment-ready है, लेकिन database वाला final production setup hosting चुनने के बाद करना सही रहेगा.
