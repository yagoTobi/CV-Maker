%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
% Medium Length Professional CV
% LaTeX Class
% Version 3.0 (December 17, 2022)
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

\ProvidesClass{resume}[2022/12/17 v3.0 Resume class]

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax

\LoadClass{article}

\usepackage[parfill]{parskip}
\usepackage{array}
\usepackage{ifthen}
\usepackage{graphicx}
\usepackage{wrapfig}

\pagestyle{empty}

\usepackage{geometry}

\geometry{
	top=0.3in,
	bottom=0.3in,
	left=0.2in,
	right=0.2in,
}

\setlength{\parskip}{0.45\baselineskip} % nudged up from 0.4, but not as aggressive as 0.5

\newcommand{\name}[1]{\renewcommand{\name}{#1}}

\newcommand{\addressSep}{$\diamond$}

\let \@addressone \relax
\let \@addresstwo \relax
\let \@addressthree \relax
\let \@addressfour \relax
\let \@addressfive \relax

\newcommand{\address}[1]{
	\@ifundefined{@addressone}{
		\def \@addressone {#1}
	}{
		\@ifundefined{@addresstwo}{
			\def \@addresstwo {#1}
		}{
			\@ifundefined{@addressthree}{
				\def \@addressthree {#1}
				}{
					\@ifundefined{@addressfour}{
						\def \@addressfour {#1}
						}{
							\def \@addressfive {#1}
						}
				}
		}%
	}
}

\newcommand{\printaddress}[1]{
	\begingroup
		\def \\ {\addressSep\ }
		\centerline{#1}
	\endgroup
	\par
}

\newcommand{\printname}{
	\begingroup
		\hfil{\huge\bfseries\name}\hfil
		\smallskip \break
	\endgroup
}

\let\ori@document=\document
\renewcommand{\document}{
	\ori@document
	\printname
	\@ifundefined{@addressone}{}{\printaddress{\@addressone}}
	\@ifundefined{@addresstwo}{}{\printaddress{\@addresstwo}}
	\@ifundefined{@addressthree}{}{\printaddress{\@addressthree}}
	\@ifundefined{@addressfour}{}{\printaddress{\@addressfour}}
	\@ifundefined{@addressfive}{}{\printaddress{\@addressfive}}
}

\newenvironment{rSection}[1]{
	\MakeUppercase{\textbf{#1}}
	\smallskip
	\hrule
	\begin{list}{}{
		\setlength{\leftmargin}{0.5em}
	}
	\item[]
}{
	\end{list}
}

\newenvironment{rSubsection}[4]{
	\textbf{#1} \hfill {#2}
	\ifthenelse{\equal{#3}{}}{}{
		\\
		\textit{#3} \hfill \textit{#4}
	}%

	\begin{list}{$\cdot$}{\leftmargin=1em}
		\setlength{\itemsep}{-0.4em} \vspace{-0.4em} % between -0.5 (original) and -0.3 (too loose)
}{
	\end{list}
	\vspace{0.1em} % just a hair of space between subsections
}