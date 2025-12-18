# Design Requirement Standards

> **เอกสารมาตรฐาน UX/UI Design สำหรับการพัฒนาแอปพลิเคชัน**  
> Version: 1.0 | Last Updated: December 2024

---

## 📋 สารบัญ (Table of Contents)

1. [Information Architecture](#1-information-architecture)
2. [Content Design](#2-content-design)
3. [Design System](#3-design-system)
4. [Performance](#4-performance)
5. [Accessibility (WCAG)](#5-accessibility-wcag)
6. [Responsive Design](#6-responsive-design)

---

## 1. Information Architecture

### 1.1 Navigation & Hierarchy (ข้อ 1)
| Item | Requirement |
|:-----|:------------|
| **Description** | ต้องมี intuitive navigation และ clear information hierarchy |
| **WCAG Reference** | WCAG 2.4.2 (Page Titled) & 2.4.6 (Headings and Labels) |
| **Status** | ☐ |

### 1.2 Page Title Requirements (WCAG 2.4.2)
| Requirement | Description | Example |
|:------------|:------------|:--------|
| **Descriptive** | Title ต้องอธิบาย topic หรือ purpose ของหน้า | "User Profile - Settings" |
| **Unique** | แต่ละหน้าต้องมี title ที่ไม่ซ้ำกัน | ไม่ใช้ "Page" ซ้ำทุกหน้า |
| **Concise** | กระชับ ได้ใจความ | "Dashboard" ไม่ใช่ "Welcome to the main dashboard page of our application" |

### 1.3 Headings & Labels Requirements (WCAG 2.4.6)
| Requirement | Description |
|:------------|:------------|
| **Descriptive Headings** | Headings ต้องอธิบาย content ที่ตามมา |
| **Descriptive Labels** | Labels ต้องอธิบาย purpose ของ input fields |
| **Hierarchy** | ใช้ heading levels (h1-h6) ตามลำดับที่ถูกต้อง |

### 1.4 Navigation Best Practices
```html
<!-- Good: Clear hierarchy -->
<main>
  <h1>Dashboard</h1>
  
  <section aria-labelledby="recent-orders">
    <h2 id="recent-orders">Recent Orders</h2>
    <p>Your most recent orders appear here.</p>
    
    <article>
      <h3>Order #12345</h3>
      <!-- Order details -->
    </article>
  </section>
  
  <section aria-labelledby="quick-actions">
    <h2 id="quick-actions">Quick Actions</h2>
    <!-- Action buttons -->
  </section>
</main>

<!-- Bad: No hierarchy, unclear purpose -->
<div>
  <div>Dashboard</div>
  <div>Recent Orders</div>
  <div>Order #12345</div>
</div>
```

---

## 2. Content Design

### 2.1 Cognitive Load (ข้อ 2)
| Item | Requirement |
|:-----|:------------|
| **Description** | ลด cognitive load ด้วย content ที่ชัดเจนและกระชับ |
| **Status** | ☐ |

### 2.2 Content Guidelines
| Principle | Guidelines |
|:----------|:-----------|
| **Clarity** | ใช้ภาษาที่เข้าใจง่าย หลีกเลี่ยงศัพท์เทคนิค |
| **Conciseness** | เขียนให้สั้น กระชับ ได้ใจความ |
| **Consistency** | ใช้ terminology เดียวกันทั้ง application |
| **Scannability** | ใช้ headings, bullet points, white space |

### 2.3 Content Writing Rules
| Rule | Good Example | Bad Example |
|:-----|:-------------|:------------|
| **Active Voice** | "Save your changes" | "Changes can be saved" |
| **Simple Words** | "Use" | "Utilize" |
| **Short Sentences** | "Click Save to continue." | "Please click on the Save button in order to continue to the next step." |
| **Clear Actions** | "Delete Order" | "Process" |

### 2.4 Error Messages
| Component | Requirement | Example |
|:----------|:------------|:--------|
| **Clear** | อธิบายว่าเกิดอะไรขึ้น | "Password must be at least 8 characters" |
| **Helpful** | บอกวิธีแก้ไข | "Enter a password with at least 8 characters, including numbers and symbols" |
| **Polite** | ไม่โทษผู้ใช้ | "Please enter a valid email" ไม่ใช่ "You entered an invalid email" |

---

## 3. Design System

### 3.1 Standardized UI Components (ข้อ 3)
| Item | Requirement |
|:-----|:------------|
| **Description** | ใช้ cohesive design system พร้อม standardized UI components |
| **Examples** | Buttons, Navigation bar, Cards |
| **Source** | ใช้ตามมาตรฐานที่ทีม Design กำหนด |
| **Status** | ☐ |

### 3.2 Core Components
| Component | Requirements |
|:----------|:-------------|
| **Buttons** | Primary, Secondary, Tertiary, Destructive variants |
| **Navigation** | Consistent nav bar, breadcrumbs |
| **Cards** | Standardized card layouts |
| **Forms** | Consistent input fields, labels, validation |
| **Modals** | Consistent dialog patterns |
| **Tables** | Standardized data tables |

### 3.3 Design Token Categories
| Category | Examples |
|:---------|:---------|
| **Colors** | Primary, Secondary, Neutral, Semantic (success, error, warning) |
| **Typography** | Font family, sizes, weights, line heights |
| **Spacing** | Margin, padding scales (4px, 8px, 16px, etc.) |
| **Borders** | Border radius, border widths |
| **Shadows** | Elevation levels |
| **Animation** | Duration, easing functions |

### 3.4 Button Component Example
```typescript
// Button variants following design system
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'tertiary' | 'destructive';
  size: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// CSS Variables for theming
:root {
  --button-primary-bg: #0066CC;
  --button-primary-hover: #0052A3;
  --button-secondary-bg: transparent;
  --button-secondary-border: #0066CC;
  --button-destructive-bg: #DC2626;
  
  --button-padding-small: 8px 16px;
  --button-padding-medium: 12px 24px;
  --button-padding-large: 16px 32px;
  
  --button-radius: 8px;
}
```

---

## 4. Performance

### 4.1 Load Time (ข้อ 4)
| Item | Requirement |
|:-----|:------------|
| **Target Load Time** | 0-2 seconds |
| **Interaction** | Smooth interactions |
| **Status** | ☐ |

### 4.2 Performance Metrics
| Metric | Target | Measurement |
|:-------|:-------|:------------|
| **First Contentful Paint (FCP)** | < 1.8s | Time to first content render |
| **Largest Contentful Paint (LCP)** | < 2.5s | Time to largest element render |
| **Time to Interactive (TTI)** | < 3.8s | Time until page is fully interactive |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Visual stability |
| **First Input Delay (FID)** | < 100ms | Responsiveness |

### 4.3 Performance Optimization Techniques
| Area | Techniques |
|:-----|:-----------|
| **Images** | Lazy loading, WebP format, responsive images, CDN |
| **JavaScript** | Code splitting, tree shaking, minification |
| **CSS** | Critical CSS, purging unused styles |
| **Fonts** | Font-display: swap, subset fonts, preload |
| **Caching** | Browser caching, service workers |

### 4.4 Loading States
| State | UX Requirement |
|:------|:---------------|
| **< 100ms** | ไม่ต้องแสดง loading |
| **100ms - 1s** | แสดง subtle loading indicator |
| **> 1s** | แสดง loading spinner/skeleton |
| **> 10s** | แสดง progress indicator with estimation |

```typescript
// Loading state example
function LoadingState({ isLoading, children }) {
  if (isLoading) {
    return <Skeleton />;
  }
  return children;
}

// Skeleton component for smooth loading
function Skeleton() {
  return (
    <div className="skeleton-container" role="status" aria-label="Loading">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}
```

---

## 5. Accessibility (WCAG)

### 5.1 WCAG 2.2 Level A Compliance
| Principle | Key Requirements |
|:----------|:-----------------|
| **Perceivable** | Content must be presentable in ways users can perceive |
| **Operable** | UI components must be operable |
| **Understandable** | Information and UI must be understandable |
| **Robust** | Content must be robust enough for assistive technologies |

### 5.2 Image Accessibility
| Requirement | Description |
|:------------|:------------|
| **Alt Text** | รูปภาพทุกรูปต้องมีข้อความอธิบาย (Alt Text) |
| **Decorative Images** | รูปตกแต่งใช้ alt="" |
| **Complex Images** | ใช้ long description หรือ caption |

```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% in Q4 2024" />

<!-- Decorative image -->
<img src="decoration.png" alt="" role="presentation" />

<!-- Complex image with description -->
<figure>
  <img src="diagram.png" alt="System architecture overview" />
  <figcaption>
    The system consists of three main components: 
    API Gateway, Backend Services, and Database Layer.
  </figcaption>
</figure>
```

### 5.3 Keyboard Navigation
| Requirement | Description |
|:------------|:------------|
| **Tab Navigation** | ใช้ Tab ได้ทุกปุ่ม โดยไม่ต้องใช้เมาส์ |
| **Enter/Space** | ใช้ Enter หรือ Space เพื่อ activate elements |
| **No Keyboard Trap** | ไม่มี keyboard trap (เช่น เปิด popup แล้วต้อง Tab หรือ Esc ออกได้) |
| **Focus Visible** | Focus indicator ต้องเห็นได้ชัด |

```css
/* Visible focus indicator */
:focus-visible {
  outline: 2px solid #0066CC;
  outline-offset: 2px;
}

/* Skip to main content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #0066CC;
  color: white;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

### 5.4 Button & Label Requirements
| Requirement | Description |
|:------------|:------------|
| **Clear Labels** | หัวข้อและปุ่มมีชื่อชัดเจน |
| **Icon Buttons** | ห้ามมีปุ่มที่มีแค่ไอคอนโดยไม่มีข้อความอธิบาย |
| **Accessible Names** | ทุก interactive element ต้องมี accessible name |

```html
<!-- Good: Button with clear label -->
<button type="submit">
  <svg aria-hidden="true">...</svg>
  Save Changes
</button>

<!-- Good: Icon button with accessible name -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>

<!-- Bad: Icon only without accessible name -->
<button type="button">
  <svg>...</svg>
</button>
```

### 5.5 Flashing Content
| Requirement | Description |
|:------------|:------------|
| **No Fast Flashing** | ไม่มีสิ่งที่กระพริบเร็วเกินไป |
| **Limit** | ไม่เกิน 3 ครั้งต่อวินาที |
| **Reason** | ป้องกันการชักจากแสง (photosensitive seizures) |

### 5.6 Form Accessibility
```html
<!-- Accessible form -->
<form>
  <div class="form-group">
    <label for="email">
      Email Address
      <span class="required" aria-hidden="true">*</span>
    </label>
    <input 
      type="email" 
      id="email" 
      name="email"
      required
      aria-required="true"
      aria-describedby="email-hint email-error"
    />
    <span id="email-hint" class="hint">
      We'll never share your email.
    </span>
    <span id="email-error" class="error" role="alert">
      Please enter a valid email address.
    </span>
  </div>
  
  <button type="submit">Submit</button>
</form>
```

---

## 6. Responsive Design

### 6.1 Breakpoints
| Breakpoint | Width | Target Devices |
|:-----------|:------|:---------------|
| **xs** | < 576px | Mobile phones |
| **sm** | ≥ 576px | Large phones |
| **md** | ≥ 768px | Tablets |
| **lg** | ≥ 992px | Laptops |
| **xl** | ≥ 1200px | Desktops |
| **xxl** | ≥ 1400px | Large desktops |

### 6.2 Required Screen Resolutions
| Category | Resolutions |
|:---------|:------------|
| **Desktop** | 1920x1200, 1920×1080, 1536×864, 1366×768 |
| **Mobile** | 360×800, 414×896, 360×640, 412×915, 390×844, 360×780, 375×667, 375×812, 360×760, 393×851, 393×873, 412×892, 428×926, 360×720 |

### 6.3 Responsive Design Principles
| Principle | Description |
|:----------|:------------|
| **Mobile First** | ออกแบบสำหรับ mobile ก่อน แล้วค่อยขยาย |
| **Fluid Grids** | ใช้ relative units (%, vw, vh) |
| **Flexible Images** | Images ปรับขนาดตาม container |
| **Touch Targets** | ขนาดอย่างน้อย 44x44px สำหรับ touch |

### 6.4 CSS Example
```css
/* Mobile first approach */
.container {
  padding: 16px;
  max-width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    max-width: 720px;
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1200px) {
  .container {
    padding: 32px;
    max-width: 1140px;
  }
}

/* Touch-friendly buttons */
.btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 24px;
}
```

---

## 7. Design Checklist

### Pre-Launch Design Checklist
| # | Category | Item | Status |
|:--|:---------|:-----|:------:|
| 1 | IA | Page titles descriptive (WCAG 2.4.2) | ☐ |
| 2 | IA | Headings describe content (WCAG 2.4.6) | ☐ |
| 3 | IA | Labels describe input purpose | ☐ |
| 4 | IA | Clear navigation hierarchy | ☐ |
| 5 | Content | Clear, concise content | ☐ |
| 6 | Content | Consistent terminology | ☐ |
| 7 | Content | Helpful error messages | ☐ |
| 8 | Design System | Using standardized components | ☐ |
| 9 | Design System | Following design tokens | ☐ |
| 10 | Performance | Page load < 2 seconds | ☐ |
| 11 | Performance | Smooth interactions | ☐ |
| 12 | A11y | All images have alt text | ☐ |
| 13 | A11y | Full keyboard navigation | ☐ |
| 14 | A11y | No keyboard traps | ☐ |
| 15 | A11y | Clear button labels | ☐ |
| 16 | A11y | No fast flashing content | ☐ |
| 17 | A11y | Visible focus indicators | ☐ |
| 18 | Responsive | Works on all required resolutions | ☐ |
| 19 | Responsive | Touch targets ≥ 44px | ☐ |
| 20 | Responsive | Readable text at all sizes | ☐ |

---

## 📎 Appendix

### A. WCAG Quick Reference
| Success Criterion | Level | Brief Description |
|:------------------|:------|:------------------|
| 1.1.1 Non-text Content | A | Text alternatives for images |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for normal text, 3:1 for large text |
| 2.1.1 Keyboard | A | All functionality via keyboard |
| 2.1.2 No Keyboard Trap | A | Can navigate away using keyboard |
| 2.4.2 Page Titled | A | Descriptive page titles |
| 2.4.6 Headings and Labels | AA | Descriptive headings and labels |
| 2.4.7 Focus Visible | AA | Visible keyboard focus |

### B. Design Tools
| Tool | Purpose |
|:-----|:--------|
| Figma | UI Design & Prototyping |
| Storybook | Component documentation |
| axe DevTools | Accessibility testing |
| Lighthouse | Performance & accessibility audit |
| WAVE | Accessibility evaluation |

### C. Color Contrast Tools
| Tool | URL |
|:-----|:----|
| WebAIM Contrast Checker | [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker/) |
| Colour Contrast Analyser | [tpgi.com/color-contrast-checker](https://www.tpgi.com/color-contrast-checker/) |
| Contrast Ratio | [contrast-ratio.com](https://contrast-ratio.com/) |

### D. Resources
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)
- [A11Y Project Checklist](https://www.a11yproject.com/checklist/)

---

*เอกสารนี้เป็นมาตรฐาน UX/UI Design สำหรับการพัฒนา Application ปรับปรุงครั้งล่าสุด: December 2024*



