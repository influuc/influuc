Available Infrastructure
========================

Purpose
-------

This document exists to inform architectural decisions.

It does not prescribe implementation decisions.

It does not define architecture.

It does not define system design.

It simply defines what infrastructure, tools, platforms, services, and resources are available to the system.

Architectural decisions should be based on product requirements first.

Available infrastructure should be considered second.

The existence of a tool does not require its use.

The architecture should remain outcome-driven rather than tool-driven.

Guiding Principle
=================

The goal is not to use more technology.

The goal is to build the simplest system capable of delivering the vision.

Complexity should be earned.

Every additional service introduces:

*   Cost
    
*   Failure points
    
*   Maintenance burden
    
*   Technical debt
    

The architecture should remain as simple as possible for as long as possible.

Product Requirements
====================

The platform must support:

*   Founder understanding
    
*   Opportunity discovery
    
*   Content generation
    
*   Content publishing
    
*   Continuous learning
    
*   Browser extension workflows
    
*   Subscription billing
    
*   Analytics
    
*   Monitoring
    

The architecture should be designed around these requirements.

Development Infrastructure
==========================

GitHub
------

Available for:

*   Source control
    
*   Pull requests
    
*   Branch management
    
*   Code review
    
*   Version history
    

GitHub should act as the primary source of truth for application code.

Jira
----

Available for:

*   Project management
    
*   Issue tracking
    
*   Planning
    
*   Documentation references
    

Jira should support development workflows rather than define product decisions.

Claude Code
-----------

Available as a development partner.

Can assist with:

*   Architecture
    
*   Planning
    
*   Development
    
*   Refactoring
    
*   Documentation
    
*   Debugging
    

Claude should be treated as a highly capable engineering resource rather than a simple code generator.

Application Infrastructure
==========================

Vercel
------

Available for:

*   Frontend hosting
    
*   Application deployment
    
*   Preview deployments
    
*   Production environments
    

Architecture should take advantage of modern deployment workflows where appropriate.

Data Infrastructure
===================

Supabase
--------

Available for:

*   Database
    
*   Authentication
    
*   Storage
    
*   Realtime capabilities
    

The architecture may use all or part of the Supabase platform depending on requirements.

The goal is not to maximize Supabase usage.

The goal is to solve product requirements efficiently.

Payment Infrastructure
======================

Stripe
------

Available for:

*   Subscriptions
    
*   Trials
    
*   Billing
    
*   Payment collection
    

The billing system should remain flexible as pricing and packaging evolve.

Pricing strategy should not be hardcoded into architectural decisions.

AI Infrastructure
=================

OpenRouter
----------

Available for:

*   Model routing
    
*   Multiple model providers
    
*   Future model flexibility
    

The platform should remain model-agnostic whenever possible.

The system should optimize for outcomes rather than attachment to specific model providers.

Research Infrastructure
=======================

Exa
---

Available for:

*   Discovery
    
*   Research
    
*   Opportunity identification
    
*   Information retrieval
    

Exa may be useful anywhere the system needs to discover information it does not already possess.

How it is used should be determined by architecture.

Firecrawl
---------

Available for:

*   Website analysis
    
*   Website retrieval
    
*   Content extraction
    
*   Structured information gathering
    

Firecrawl may support onboarding, learning, opportunity discovery, or future systems.

Specific usage should be determined by architecture.

Workflow Infrastructure
=======================

Trigger.dev
-----------

Available for:

*   Scheduled jobs
    
*   Background processing
    
*   Long-running workflows
    
*   System automation
    

The platform should heavily favor automation where appropriate.

Many Influuc responsibilities are asynchronous by nature.

Communication Infrastructure
============================

Resend
------

Available for:

*   Transactional email
    
*   Notifications
    
*   Lifecycle communication
    

Communication should remain useful and minimal.

The platform should not become notification-heavy.

Analytics Infrastructure
========================

PostHog
-------

Available for:

*   Product analytics
    
*   User behavior analytics
    
*   Funnel analysis
    
*   Event tracking
    

Analytics should primarily support product improvement.

The goal is not maximizing engagement.

The goal is maximizing outcomes.

Monitoring Infrastructure
=========================

Sentry
------

Available for:

*   Error tracking
    
*   Performance monitoring
    
*   Operational visibility
    

Reliability should be treated as a product feature.

Browser Infrastructure
======================

Plasmo
------

Available for browser extension development.

The extension exists to reduce friction.

Not increase it.

The extension should support:

*   Founder understanding
    
*   Context gathering
    
*   Workflow acceleration
    

The extension should not create trust concerns.

User trust is more important than data collection.

Social Infrastructure
=====================

X
-

Available through developer access.

Potential use cases may include:

*   Publishing
    
*   Analysis
    
*   Learning
    
*   Opportunity discovery
    

Specific usage should be determined through architecture.

LinkedIn
--------

Available through developer access.

Potential use cases may include:

*   Publishing
    
*   Learning
    
*   Founder understanding
    

Specific implementation decisions should remain flexible.

Architecture Constraints
========================

The architecture should optimize for:

Simplicity
----------

Avoid unnecessary complexity.

Scalability
-----------

Support future growth.

Maintainability
---------------

Remain understandable.

Cost Efficiency
---------------

Optimize for healthy unit economics.

Reliability
-----------

Critical workflows should remain dependable.

Founder Experience
------------------

Every architectural decision should ultimately improve founder experience.

Technology exists to serve the product.

The product exists to serve the founder.

Never reverse that relationship.

Final Principle
===============

The architecture should be driven by:

Vision

↓

Product Requirements

↓

User Experience

↓

System Design

↓

Infrastructure

Not the other way around.

The tools listed in this document are resources available to the architecture.

They are not instructions.

The system should use whatever combination of tools best fulfills the vision of Influuc.