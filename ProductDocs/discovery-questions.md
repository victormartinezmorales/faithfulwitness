# Portal Discovery Questions

Fill in your answers inline. Skip anything you don't know yet — we'll flag it as a decision to make later.

---

## User Types

### Participant

1. **Returning or one-time?** Is this a one-time experience (complete the discernment journey, get results, done) or do participants come back repeatedly?

   > We will have these users coming back repeatedly as they progress through the stages of the discernment journey. They will be able to track their progress, access resources, and engage with the community over time.

2. **Solo or team-based?** Can participants go through the experience solo, or do they always belong to a team? Or both?

   > _Your answer: initally solo but we do eventually wanna support groups for connecting to orgs or going through content.

3. **Post-completion dashboard.** After a participant finishes the assessment, what's the most important thing they see? (Results summary, next steps, community connections, resources?)

   > _Your answer: next steps and resources, with an option to connect to community or join a team if they choose.

---

### Micah Catalyst (Regional Leader)

4. **Core job.** What does a Micah Catalyst actually *do* in the portal day-to-day? (Examples: manage participants in their region, run cohorts/events, view aggregate data, message people — which of these?)

   > _Your answer: the Micah Catalyst is currently the the primary one connecting people to the organization and helping them navigate the discernment journey. They will manage participants in their region, run cohorts/events, view aggregate data, and message people as needed. This tool is meant to try and digitize and streamline that process for them, so they can focus on the relational aspects of their work and less on the connection and managing materials.

5. **Relationship to Partner Orgs.** How does a Micah Catalyst relate to Partner Organizations? Do they oversee multiple partners, work alongside them, or are they separate tracks entirely?

   > _Your answer: The Micah Catalysts work with organizations to connect them with participannts.

6. **Geographic scope.** Is "regional" defined by a geography (state, metro area), by a church network, or something else?

   > _Your answer: There are 11 currently and I have attatched photos with the prmpt when I am done.

---

### Partner Organization Admin

7. **Read-only or configurable?** Is this purely analytics (see how many participants came from our org, track attribution) or can partner admins configure anything (upload logos, set messaging, invite participants)?

   > _Your answer: To begin lets just have them be able to access analytics and possibly connect with participants. We may add more as we move along.

8. **Relationship to participants.** How does a participant get associated with a Partner Org? (They select it during signup, they're invited by the partner, a code/link, something else?)

   > _Your answer: There is a CTA to connec them with orgs and have details about the ones in their region. Our North Star for this entire experience is to connect participants with orgs and help them find a place to serve. We want to make it as easy as possible for them to find the right org for them. All the content and resources in the portal are meant to help them find a way to get involved and not keep them in the portal.

9. **Multiple users per org?** Can a Partner Org have more than one admin account, or is it one login per org?

   > _Your answer: We want to allow for multiple users per org, so that they can collaborate and manage their participants more effectively. Each admin should have their own login and permissions, but they should be able to see the same data and manage the same participants.

---

### FaithfulWitness Admin

10. **Scope of admin.** Is this the full insights dashboard today (map, participant feed, all stats)? What else do admins need to do that isn't in the current prototype?

    > _Your answer: Lets keep it just scoped to everything in the prototype for now. We can add more features as we go along, but we want to make sure that the core functionality is solid before we add more complexity.

11. **User management.** Do admins need to manage accounts — create users, assign roles, reset passwords, deactivate accounts?

    > _Your answer: Yes, admins will need to manage accounts. They should be able to create users, assign roles, reset passwords, and deactivate accounts as needed. This will help them maintain control over the platform and ensure that only authorized users have access to the system.

12. **Content management.** Do admins need to edit any content in the product — assessment questions, stage copy, resources, email templates?

    > _Your answer: For now we do not need to put that in the portal but can put that in a post MVP phase list that we may get to.

---

## Data and Flows

13. **Existing Supabase project?** Is there an existing Supabase project already, or are we starting fresh? If existing — what tables/data do you already have?

    > _Your answer: There is Supabase backing the prototype but we are free to start froms scratch with it all.

14. **Assessment data today.** Does the questionnaire in `index.html` currently save responses anywhere, or is it purely client-side?

    > _Your answer: I do not know where or if it saves. I think in Supabase but you can look to confirm. I would say we want to store them in Supabase so we can track progress and have a record of their responses for future reference. I do want to keep as little data as possible while still ensuring that we have what we need to help them on their journey. We want to be mindful of privacy and data security, and only collect the information that is necessary for the experience which at a minimum is their email and their postal code as well as their responses to the assessment.

15. **Account creation timing.** Do participants need to create an account *before* taking the assessment, after completing it, or is it optional (anonymous → claim results later)?

    > _Your answer: I need to discuss with the team but it would be nice to have them give an email and postal code after to have the results emailed to them. That will then be the account and maybe we just do an email magic link to log in and access the data. We could also add other login options like Google or Apple possibly.

16. **Team formation.** Are teams created by Micah Catalysts and participants join them, or does a participant self-select a team/church during signup?

    > _Your answer: We will worry about teams post MVP.

---

## Scale and Real-Time

17. **Year 1 user estimate.** Rough expected users across all four types in year 1? (Hundreds, thousands, tens of thousands — ballpark is fine.)

    > _Your answer: This I do not know. Hopefully thousands. 

18. **Real-time needs.** Any live-updating requirements? (Auto-refreshing dashboards, push notifications, event check-ins happening simultaneously, live cohort sessions?)

    > _Your answer: No need for any of that for MVP 

---

## Tech and Deployment

19. **React framework preference.** Any strong feelings or hard "no"s on the meta-framework? (Next.js App Router is the default given Vercel, but worth asking.)

    > _Your answer: I do not have a preference. Whatever is best and easiest for AI Agents to work with.

20. **Transactional email.** What provider handles email today? (Magic-link auth in the partner flow means something is already sending — Resend, Postmark, SendGrid, Supabase's built-in?)

    > _Your answer: I do not have a preference. I think the team was thinking MailChimp but I am open to options.

21. **Mobile priority.** Which portals need to work well on phone? (Participant flow seems likely — what about the others?)

    > _Your answer: This must be able to be used on mobile for all users. I want to have reactive design for all views.

22. **Payments.** Any paid features, subscriptions, or Stripe integration needed, or is all access role-gated and free?

    > _Your answer: No paid features.

23. **Launch timeline.** Is there a target date or phase you're working toward?

    > _Your answer: We are hoping to have the MVP done by some time in August.
