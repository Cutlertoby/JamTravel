import type { Post } from "@/lib/types";

// Renders the article body in the exact section order the CRM + pipeline use:
// quick answer → intro → sections → pull quote → steps → tips → closing → FAQs.
// Shared by the public article page and the admin live preview so they never
// drift apart. Styling lives in globals.css under `.article-body`.

export default function ArticleBody({ post }: { post: Post }) {
  const intro = post.intro_paragraphs || [];
  const sections = post.sections || [];
  const steps = post.steps || [];
  const tips = post.tip_list || [];
  const faqs = post.faqs || [];
  const closing = post.closing_paragraphs || [];

  return (
    <div className="article-body">
      {post.quick_answer ? (
        <div className="quick-answer">
          <strong>Quick answer</strong>
          <p>{post.quick_answer}</p>
        </div>
      ) : null}

      {intro.map((p, i) => (
        <p key={`intro-${i}`} dangerouslySetInnerHTML={{ __html: p }} />
      ))}

      {sections.map((s, i) => (
        <section key={`sec-${i}`}>
          {s.h2 ? (
            s.link ? (
              <h2><a href={s.link} target="_blank" rel="noopener noreferrer">{s.h2}</a></h2>
            ) : (
              <h2>{s.h2}</h2>
            )
          ) : null}
          {(s.paragraphs || []).map((p, j) => (
            <p key={`sec-${i}-p-${j}`} dangerouslySetInnerHTML={{ __html: p }} />
          ))}
          {s.cta_text && s.cta_url ? (
            <a href={s.cta_url} target="_blank" rel="noopener noreferrer" className="inline-download-btn">
              {s.cta_text}
            </a>
          ) : null}
        </section>
      ))}

      {post.pull_quote ? (
        <div className="pull-quote">
          <p>&ldquo;{post.pull_quote}&rdquo;</p>
        </div>
      ) : null}

      {steps.length ? (
        <>
          <h2>Step-by-step</h2>
          <ol className="steps-list">
            {steps.map((s, i) => (
              <li key={`step-${i}`}>
                <strong>{s.heading}</strong>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {post.tip_list_heading ? <h2>{post.tip_list_heading}</h2> : null}
      {tips.length ? (
        <ul>
          {tips.map((t, i) => (
            <li key={`tip-${i}`}>{t}</li>
          ))}
        </ul>
      ) : null}

      {closing.map((p, i) => (
        <p key={`closing-${i}`} dangerouslySetInnerHTML={{ __html: p }} />
      ))}

      {faqs.length ? (
        <>
          <h2>Frequently asked questions</h2>
          <div className="faqs">
            {faqs.map((f, i) => (
              <div className="faq" key={`faq-${i}`}>
                <strong>{f.question}</strong>
                <p>{f.answer}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
