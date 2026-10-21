import type { RenderedContract } from "@/lib/partner/contract-template";

// 계약서 본문 표시용(서버·클라이언트 어디서나 쓸 수 있는 순수 표시 컴포넌트).
export function ContractView({ contract }: { contract: RenderedContract }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-800">
      <h3 className="text-center text-base font-semibold text-slate-900">{contract.title}</h3>
      <p className="whitespace-pre-wrap">{contract.preamble}</p>
      {contract.articles.map((article) => (
        <section key={article.title} className="space-y-1.5">
          <h4 className="font-semibold text-slate-900">{article.title}</h4>
          <ol className="space-y-1.5">
            {article.clauses.map((clause, i) => (
              <li key={i} className="space-y-1">
                <p>
                  {article.clauses.length > 1 ? `${i + 1}. ` : ""}
                  {clause.text}
                </p>
                {clause.subs && (
                  <ul className="list-disc space-y-0.5 pl-6 text-slate-700">
                    {clause.subs.map((sub) => (
                      <li key={sub}>{sub}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
