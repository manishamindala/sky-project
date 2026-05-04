Nexora Admin Portal
A full-stack web application built with Python Flask and SQLite for managing an institutional skills tracking system. Admins can manage learners, verifiers, collaborators, and opportunities through a clean, modern dashboard.

🚀 Features
Authentication

Admin Signup with full validation
Admin Login with Remember Me support
Forgot Password with token-based reset (logged to console)
Captcha verification on all auth forms
Session management with Flask sessions

Dashboard

Overview stats (students, teachers, parents)
Opportunity Analytics chart (daily/weekly/monthly/quarterly/yearly)
Platform Analytics bar chart
Notification panel
Dark/Light theme toggle

Learner Management

View all students in a table
Filter by status (Active, Inactive, Pending, Deactivated)
Quick Add Student modal
Bulk Upload via CSV

Verifier Management

View all verifiers/teachers
Filter by status
Quick Add Verifier modal
Bulk Upload via CSV
View verifier details and subjects

Collaborator Management

View all collaborators
View submitted courses
Approve or Reject courses

Opportunity Management (fully connected to backend)

Create new opportunities with full form validation
View all opportunities (admin-scoped, from database)
Edit existing opportunities
Delete with confirmation prompt
View full details modal
Empty state when no opportunities exist

Reports & Analytics

Student engagement trends
Course completion rates by category
Verification status table
Student level distribution

⚙️ Setup & Installation
Prerequisites

Python 3.10+
pip 
Steps
bash# 1. Clone the repository
git clone https://github.com/Neerajvs32/Test1.git
cd Test1/sky

# 2. Install dependencies
pip install flask werkzeug

# 3. Run the server
python app.py 

🛠️ Tech Stack
LayerTechnologyBackendPython, FlaskDatabaseSQLite (via Python stdlib sqlite3)FrontendHTML, CSS, Vanilla JavaScriptAuthFlask Sessions + Werkzeug password hashingStylingCustom CSS with CSS Variables (Orange & Dark theme)


Open in browser
http://localhost:5000
The SQLite database is created automatically on first run.
🔐 Security Features

Passwords hashed using Werkzeug's generate_password_hash
Admin isolation — each admin only sees their own opportunities
Password reset tokens expire after 1 hour
Tokens are single-use (marked as used after reset)
Forgot password always returns the same message (privacy protection)
CORS configured for localhost development


📝 Notes

Password Reset Links are printed to the Flask console (no email sending at this stage)
Opportunity data is fully persisted in SQLite and survives server restarts
Session persistence — if Remember Me is checked, session lasts 30 days
No external database required — SQLite is built into Python


👨‍💻 Developer
Manish Amindala
Built as part of an internship task for the Qatar Foundation Admin Portal project.

📄 License
This project is for educational/internship purposes.


🌐 **Live Demo:** [https://sky-project-xv5r.onrender.com](https://sky-project-xv5r.onrender.com)
