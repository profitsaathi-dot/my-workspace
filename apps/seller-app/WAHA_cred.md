## Pull Docker image for arm
docker tag devlikeapro/waha:arm devlikeapro/waha

# Rename it, so you can use devlikeapro/waha image in other place
docker tag devlikeapro/waha:arm devlikeapro/waha

# Init WAHA
docker run --rm -v "$(pwd)":/app/env devlikeapro/waha init-waha /app/env

# To start 
docker run -it \
  --env-file "$(pwd)/.env" \
  -v "$(pwd)/sessions:/app/.sessions" \
  --rm \
  -p 3004:3000 \
  --name waha \
  devlikeapro/waha


Generated env values:
  - WAHA_API_KEY=e48f5e804f894463883d05c5f85721fe
  - WAHA_API_KEY_PLAIN=e48f5e804f894463883d05c5f85721fe
  - WAHA_DASHBOARD_USERNAME=admin
  - WAHA_DASHBOARD_PASSWORD=9ad2df019d9f45fc814f25cd094ccd68
  - WHATSAPP_SWAGGER_USERNAME=admin
  - WHATSAPP_SWAGGER_PASSWORD=9ad2df019d9f45fc814f25cd094ccd68

Use these credentials to login in Dashboard or Swagger:
  - Username: admin
  - Password: 9ad2df019d9f45fc814f25cd094ccd68

Use this API key in the x-api-key header:
  - e48f5e804f894463883d05c5f85721fe