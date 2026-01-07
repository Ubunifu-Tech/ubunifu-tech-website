# Ubunifu Technologies - Brand Guidelines

> **Official branding assets and guidelines for Ubunifu Technologies**

---

## 📋 Brand Identity

### Company Names
- **Full Legal Name**: Ubunifu Technologies
- **Short Name**: Ubunifu Tech
- **Logo Display**: UBUNIFU TECH
- **Domain**: ubunifutech.com

### Taglines
- **Primary**: "Digital Transformation & Strategic Consulting"
- **Secondary**: "Technology. Strategy. Results."

### Mission Statement
Empowering Tanzanian businesses and organizations through strategic implementation of digital solutions across all sectors.

---

## 🎨 Color Palette

### Primary Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Electric Blue** | `#00d4ff` | `rgb(0, 212, 255)` | Primary brand color, CTAs, links, gradient start |
| **Neon Purple** | `#7928ca` | `rgb(121, 40, 202)` | Secondary brand color, accents, gradient end |
| **Deep Blue/Black** | `#0a0f1c` | `rgb(10, 15, 28)` | Background, dark surfaces |
| **Gold** | `#ffd700` | `rgb(255, 215, 0)` | Accent color, highlights, success states |

### Surface Colors

| Color Name | Hex Code | RGBA | Usage |
|------------|----------|------|-------|
| **Surface 1** | N/A | `rgba(255, 255, 255, 0.05)` | Cards, panels (light overlay) |
| **Surface 2** | N/A | `rgba(255, 255, 255, 0.1)` | Hover states, elevated surfaces |
| **Glass** | N/A | `rgba(10, 15, 28, 0.7)` | Glassmorphism effects |
| **Glass Border** | N/A | `rgba(255, 255, 255, 0.1)` | Card borders, dividers |

### Text Colors

| Color Name | Hex Code | RGBA | Usage |
|------------|----------|------|-------|
| **Foreground** | `#ffffff` | `rgb(255, 255, 255)` | Primary text |
| **Text Muted** | N/A | `rgba(255, 255, 255, 0.7)` | Secondary text, descriptions |
| **Text Subtle** | N/A | `rgba(255, 255, 255, 0.5)` | Tertiary text, metadata |

### Gradients

```css
/* Primary Gradient (Blue to Purple) */
background: linear-gradient(135deg, #00d4ff 0%, #7928ca 100%);

/* Used for: Logo text, headings, CTAs, brand elements */
```

---

## 🖋️ Typography

### Font Families

| Type | Font Family | Fallback | Usage |
|------|-------------|----------|-------|
| **Headings** | Outfit | sans-serif | H1-H6, navigation, buttons |
| **Body** | Inter | sans-serif | Paragraphs, lists, forms |

### Font Weights
- **Regular**: 400
- **Semi-Bold**: 600
- **Bold**: 700
- **Extra Bold**: 800 (for large headings)

### Font Sizes (Desktop)

| Element | Size | Line Height | Weight |
|---------|------|-------------|--------|
| H1 (Hero) | 3.5rem (56px) | 1.1 | 800 |
| H2 (Section) | 3rem (48px) | 1.2 | 700 |
| H3 (Subsection) | 2rem (32px) | 1.3 | 700 |
| Body Large | 1.125rem (18px) | 1.7 | 400 |
| Body Regular | 1rem (16px) | 1.6 | 400 |
| Small | 0.875rem (14px) | 1.5 | 400 |

---

## 🎯 Logo Usage

### Logo Files
- **Primary Logo**: `/ubunifu-tech-logo.png`
- **Location**: Root directory or `/public/images/`

### Logo Variants Needed
- [ ] Horizontal layout (UBUNIFU TECH)
- [ ] Stacked/Vertical layout
- [ ] Icon only (for favicons)
- [ ] White version (for dark backgrounds)
- [ ] Monochrome version
- [ ] With tagline variant

### Clear Space
- Maintain minimum clear space around logo equal to the height of "U" in UBUNIFU
- Never place logo on busy backgrounds that reduce legibility

### Minimum Sizes
- **Web**: 120px width minimum
- **Print**: 1 inch width minimum
- **Favicon**: 32x32px, 64x64px

### Logo Don'ts
- ❌ Don't change colors (except approved white/monochrome versions)
- ❌ Don't rotate or skew
- ❌ Don't add effects (shadows, outlines) unless part of approved design
- ❌ Don't place on low-contrast backgrounds

---

## 🎨 Design System

### Border Radius
```css
--radius-sm: 8px;   /* Buttons, tags */
--radius-md: 12px;  /* Cards, panels */
--radius-lg: 16px;  /* Hero sections, large containers */
```

### Spacing Scale
```css
--space-xs: 0.5rem;  /* 8px */
--space-sm: 1rem;    /* 16px */
--space-md: 1.5rem;  /* 24px */
--space-lg: 2rem;    /* 32px */
--space-xl: 3rem;    /* 48px */
--space-2xl: 4rem;   /* 64px */
--space-3xl: 6rem;   /* 96px */
--space-4xl: 8rem;   /* 128px */
```

### Shadows
```css
/* Glass Panel Effect */
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);

/* Hover Elevation */
box-shadow: 0 8px 32px rgba(0, 212, 255, 0.15);
```

---

## 🖼️ UI Components

### Buttons

**Primary Button**
```css
background: linear-gradient(135deg, #00d4ff, #7928ca);
color: #ffffff;
padding: 0.875rem 2rem;
border-radius: 8px;
font-weight: 600;
```

**Outline Button**
```css
background: transparent;
border: 2px solid rgba(255, 255, 255, 0.2);
color: #ffffff;
padding: 0.875rem 2rem;
border-radius: 8px;
```

### Cards
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 12px;
padding: 2rem;
```

---

## 📧 Contact & Digital Assets

### Official Contacts
- **Email**: richardpallangyo@ubunifutech.com
- **Website**: ubunifutech.com
- **Location**: Dar es Salaam, Tanzania

### Social Media (When Available)
- **LinkedIn**: /company/ubunifu-technologies
- **Twitter/X**: @ubunifutech
- **Instagram**: @ubunifutech

---

## 💼 Brand Voice & Tone

### Brand Personality
- **Expert but not intimidating**
- **Innovative but proven**
- **Global standards with local presence**
- **Professional but approachable**
- **Data-driven AND creative**

### Writing Style
- Use clear, jargon-free language
- Lead with benefits, not features
- Be honest about being a new business
- Emphasize Silicon Valley training + Tanzania knowledge
- Use "we" and "you" for conversational tone

### Key Messages
1. **Local Presence**: "Tanzania-based, Silicon Valley-trained"
2. **Comprehensive**: "Complete digital transformation services"
3. **Accessible**: "From Excel analysis to AI systems"
4. **Results-Focused**: "Technology. Strategy. Results."
5. **Honest**: "Building our reputation project by project"

---

## 🎯 Target Sectors

- SMEs & Startups
- Tourism & Hospitality
- NGOs & Civil Society
- Healthcare
- Financial Services
- Agriculture
- Education
- Government & Public Sector
- Retail & Manufacturing

---

## 📱 CSS Variables Reference

Copy this into your CSS for consistent branding:

```css
:root {
  /* Brand Colors */
  --background: #0a0f1c;
  --foreground: #ffffff;
  --primary: #00d4ff;
  --secondary: #7928ca;
  --accent: #ffd700;
  
  /* Surface Colors */
  --surface-1: rgba(255, 255, 255, 0.05);
  --surface-2: rgba(255, 255, 255, 0.1);
  --glass: rgba(10, 15, 28, 0.7);
  --glass-border: rgba(255, 255, 255, 0.1);

  /* Typography */
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'Inter', sans-serif;

  /* Spacing */
  --container-width: 1200px;
  --nav-height: 80px;
}

/* Text Gradient Utility */
.text-gradient {
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glass Panel Utility */
.glass-panel {
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
}
```

---

## 📋 Quick Reference Card

**Copy this for quick access:**

```
COLORS:
Primary Blue: #00d4ff
Secondary Purple: #7928ca
Background: #0a0f1c
Gold Accent: #ffd700

FONTS:
Headings: Outfit
Body: Inter

TAGLINE:
Digital Transformation & Strategic Consulting

BRAND PROMISE:
Technology. Strategy. Results.

EMAIL:
richardpallangyo@ubunifutech.com

DOMAIN:
ubunifutech.com
```

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Maintained By**: Ubunifu Technologies Team
