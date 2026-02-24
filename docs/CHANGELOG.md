# Changelog

All notable changes to CV Maker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Project documentation folder (`/docs`)

---

## [0.0.4] - 2026-02-24

### Added
- Unsaved changes indicator in PDF preview component
- User refinement options in CV agent prompt

### Changed
- Enhanced PDF preview styling

---

## [0.0.3] - 2026-02-23

### Added
- Hiring manager insights in CV agent prompt
- Undo functionality for AI-suggested edits in ChatPanel
- Undo support for edits applied from JobInput component

### Changed
- Improved PDF page count extraction logic

---

## [0.0.2] - 2026-02-22

### Added
- Enhanced CV editing features

### Changed
- Improved UI responsiveness across components

---

## [0.0.1] - 2026-02-21

### Added
- Initial project setup
- React frontend with Vite and TypeScript
- FastAPI backend with Python
- LaTeX editor with CodeMirror integration
- PDF preview with live compilation
- AI chat assistant using AWS Bedrock
- Match analysis feature for CV-job compatibility
- LaTeX CV template
- User profile storage

---

## Version Numbering

This project uses semantic versioning:
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

## How to Update This File

When making changes:
1. Add entries under `[Unreleased]` during development
2. When releasing, move unreleased items to a new version section
3. Use categories: Added, Changed, Deprecated, Removed, Fixed, Security
