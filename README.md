# Kennedy Course Compass

Build a course-planning web app for Harvard Kennedy School MPP students, using the attached hks_courses.csv as the course data. Key columns: course_number, title, instructors, term (2026 Fall / 2027 Spring), session (Full Term, Fall 1, Fall 2, Spring 1, Spring 2, January), section, days (e.g. Tue/Thu), start_time and end_time (24-hour), credits, academic_area, consent, recommended_prep, description, course_notes and url.

The app has four screens:
1) Profile: the student picks a term, enters career goals and skills they want to build (free text plus quick-select chips like data analysis, economics, development, negotiation, leadership, writing, consulting), picks academic areas they’re interested in, sets target credits, and marks days they’re unavailable.
2) My matches: rank courses by how well the profile matches each course’s title, description and academic area. Show the top 15 with a one-line reason each. Hide courses on unavailable days. Add filters for session, credits, academic area and ‘no consent required’. Show multi-section courses once, with a section picker.
3) Schedule builder: students add courses to a weekly calendar with tabs for each session (Fall 1, Fall 2, full term). Flag time clashes in red, show total credits per session, and show ‘Time TBA’ courses in a separate list rather than on the calendar.
4) My plan: a summary of chosen courses with credits, sessions, recommended prep warnings, and a link to each course’s my.harvard page.

Use a clean, simple design. Don’t require a login. Save the student’s profile and plan in the browser so they don’t lose it on refresh.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kennedy-course-compass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/134dd718-25f3-4bf5-9bc3-ca516ffdfcd1).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
