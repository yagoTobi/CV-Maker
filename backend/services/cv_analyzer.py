import re
from typing import Dict, List, Any


class CVAnalyzer:
    """Analyzes LaTeX CV content to extract structured information."""

    def parse_cv(self, tex_content: str) -> Dict[str, Any]:
        """
        Parse LaTeX CV content and extract structured information.

        Returns:
            Dict containing extracted CV sections and data
        """
        result = {
            "name": self._extract_name(tex_content),
            "summary": self._extract_summary(tex_content),
            "experience": self._extract_section(tex_content, "Experience"),
            "education": self._extract_section(tex_content, "Education"),
            "skills": self._extract_skills(tex_content),
            "raw_content": tex_content
        }
        return result

    def _extract_name(self, content: str) -> str:
        """Extract name from \\name{...} command."""
        match = re.search(r"\\name\{([^}]+)\}", content)
        return match.group(1) if match else ""

    def _extract_summary(self, content: str) -> str:
        """Extract the summary/objective from the beginning."""
        # Look for content between \begin{document} and first \begin{rSection}
        match = re.search(
            r"\\begin\{document\}.*?\\begin\{center\}\s*(.*?)\s*\\end\{center\}",
            content,
            re.DOTALL
        )
        if match:
            return self._clean_latex(match.group(1))
        return ""

    def _extract_section(self, content: str, section_name: str) -> List[Dict[str, str]]:
        """Extract a specific rSection."""
        pattern = rf"\\begin\{{rSection\}}\{{{section_name}\}}(.*?)\\end\{{rSection\}}"
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return []

        section_content = match.group(1)
        items = []

        # Extract rSubsection entries
        subsection_pattern = r"\\begin\{rSubsection\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}(.*?)\\end\{rSubsection\}"

        for sub_match in re.finditer(subsection_pattern, section_content, re.DOTALL):
            items.append({
                "organization": self._clean_latex(sub_match.group(1)),
                "date": self._clean_latex(sub_match.group(2)),
                "title": self._clean_latex(sub_match.group(3)),
                "location": self._clean_latex(sub_match.group(4)),
                "details": self._extract_items(sub_match.group(5))
            })

        return items

    def _extract_skills(self, content: str) -> Dict[str, str]:
        """Extract skills section."""
        pattern = r"\\begin\{rSection\}\{Skills\}(.*?)\\end\{rSection\}"
        match = re.search(pattern, content, re.DOTALL)

        if not match:
            return {}

        skills = {}
        section_content = match.group(1)

        # Look for rows in tabular
        row_pattern = r"([^&]+)&([^\\]+)\\\\"
        for row_match in re.finditer(row_pattern, section_content):
            key = self._clean_latex(row_match.group(1)).rstrip(":")
            value = self._clean_latex(row_match.group(2))
            if key and value:
                skills[key] = value

        return skills

    def _extract_items(self, content: str) -> List[str]:
        """Extract \\item entries from content."""
        items = []
        pattern = r"\\item\s*(.*?)(?=\\item|$)"
        for match in re.finditer(pattern, content, re.DOTALL):
            item_text = self._clean_latex(match.group(1).strip())
            if item_text:
                items.append(item_text)
        return items

    def _clean_latex(self, text: str) -> str:
        """Remove LaTeX commands and clean up text."""
        # Remove common LaTeX commands
        text = re.sub(r"\\textbf\{([^}]*)\}", r"\1", text)
        text = re.sub(r"\\textit\{([^}]*)\}", r"\1", text)
        text = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", text)
        text = re.sub(r"\\underline\{([^}]*)\}", r"\1", text)
        text = re.sub(r"\\fontsize\{[^}]*\}\{[^}]*\}\\selectfont\{([^}]*)\}", r"\1", text)
        text = re.sub(r"\\hfill\{?[^}]*\}?", "", text)
        text = re.sub(r"\\\\", " ", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()


cv_analyzer = CVAnalyzer()
