import os
import logging
from typing import Optional
import resend
from utils.config import config

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        logger.info("Initializing EmailService...")
        self.api_key = os.getenv('RESEND_API_KEY')
        self.sender_email = os.getenv('RESEND_SENDER_EMAIL', 'confirm@onboarding.becomeomni.com')
        self.sender_name = os.getenv('RESEND_SENDER_NAME', 'OMNI Team')
        self.sender_return = os.getenv('RESEND_SENDER_NAME', 'onboarding')
        
        logger.debug(f"EmailService configuration - Sender: {self.sender_name} <{self.sender_email}>")
        
        if not self.api_key:
            logger.warning("RESEND_API_KEY not found in environment variables")
            self.client = None
        else:
            resend.api_key = self.api_key
            self.client = resend
            logger.info("EmailService initialized successfully with Resend API")
    
    def send_welcome_email(self, user_email: str, user_name: Optional[str] = None) -> bool:
        logger.info(f"Starting to send welcome email to: {user_email}")
        
        if not self.api_key:
            logger.error("Cannot send email: RESEND_API_KEY not configured")
            return False
    
        if not user_name:
            user_name = user_email.split('@')[0].title()
            logger.debug(f"No user name provided, generated from email: {user_name}")
        
        logger.debug(f"Preparing welcome email for user: {user_name} ({user_email})")
        
        subject = "🎉 Welcome to OMNI — Let's Get Started "
        logger.debug(f"Email subject: {subject}")
        
        logger.debug("Generating email templates...")
        html_content = self._get_welcome_email_template(user_name)
        text_content = self._get_welcome_email_text(user_name)
        logger.debug(f"Generated HTML template length: {len(html_content)} characters")
        logger.debug(f"Generated text template length: {len(text_content)} characters")
        
        return self._send_email(
            to_email=user_email,
            to_name=user_name,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
    
    def _send_email(
        self, 
        to_email: str, 
        to_name: str, 
        subject: str, 
        html_content: str, 
        text_content: str
    ) -> bool:
        logger.debug(f"Preparing to send email - To: {to_name} <{to_email}>, Subject: {subject}")
        
        try:
            params: resend.Emails.SendParams = {
                "from": f"{self.sender_name} <{self.sender_email}>",
                "to": [f"{to_name} <{to_email}>"],
                "subject": subject,
                "html": html_content,
                "text": text_content,
                "custom_return_path": self.sender_return,
                "tags": [
                    {
                        "name": "category",
                        "value": "welcome"
                    }
                ]
            }
            
            logger.debug("Sending email via Resend API...")
            response = resend.Emails.send(params)
            
            if response and hasattr(response, 'id'):
                logger.info(f"Welcome email sent successfully to {to_email}. Message ID: {response.id}")
            else:
                logger.info(f"Welcome email sent successfully to {to_email}. Response: {response}")
            
            logger.debug(f"Full Resend API response: {response}")
            return True
                
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}", exc_info=True)
            logger.debug(f"Email parameters that failed: From={self.sender_name} <{self.sender_email}>, To={to_name} <{to_email}>, Subject={subject}")
            return False
    
    def _get_welcome_email_template(self, user_name: str) -> str:
        logger.debug(f"Generating HTML welcome email template for user: {user_name}")
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OMNI</title>
  <style>
    body {{
      font-family: Arial, sans-serif;
      background-color: #ffffff;
      color: #000000;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }}
    .container {{
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      background-color: #ffffff;
    }}
    .logo-container {{
      text-align: center;
      margin-bottom: 30px;
      padding: 10px 0;
    }}
    .logo {{
      max-width: 100%;
      height: auto;
      max-height: 60px;
      display: inline-block;
    }}
    h1 {{
      font-size: 24px;
      color: #000000;
      margin-bottom: 20px;
    }}
    p {{
      margin-bottom: 16px;
    }}
    a {{
      color: #3366cc;
      text-decoration: none;
    }}
    a:hover {{
      text-decoration: underline;
    }}
    .button {{
      display: inline-block;
      margin-top: 30px;
      background-color: #3B82F6;
      color: white !important;
      padding: 14px 24px;
      text-align: center;
      text-decoration: none;
      font-weight: bold;
      border-radius: 6px;
      border: none;
    }}
    .button:hover {{
      background-color: #2563EB;
      text-decoration: none;
    }}
    .emoji {{
      font-size: 20px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-container">
      <img src="" alt=" Omni Operator Logo" class="logo">
    </div>
    <h1>Welcome to OMNI!</h1>

    <p>Hi {user_name},</p>

    <p><em><strong>Welcome to OMNI — we're excited to have you on board!</strong></em></p>

    <p>Let us know if you need help getting started or have questions — we're always here.</p>

    <p>Thanks again, and welcome to the OMNI community <span class="emoji">🌞</span></p>

    <p>— The OMNI Team</p>

    <a href="https://operator.becomeomni.com/" class="button">Go to the platform</a>
  </div>
</body>
</html>"""
    
    def _get_welcome_email_text(self, user_name: str) -> str:
        logger.debug(f"Generating text welcome email template for user: {user_name}")
        return f"""Hi {user_name},

Welcome to OMNI — we're excited to have you on board!

Let us know if you need help getting started or have questions — we're always here.

Thanks again, and welcome to the OMNI community 🌞

— The OMNI Team

Go to the platform: https://operator.becomeomni.com/

---
© 2025 Omni. All rights reserved.
You received this email because you signed up for a Omni account."""

# Initialize the email service instance
logger.info("Creating EmailService instance...")
email_service = EmailService() 
logger.info("EmailService instance created and ready for use") 
