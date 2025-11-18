export function TermSection({ title, color, terms }) {
  return (
    <div>
      <h5 className={`text-lg ${color} font-semibold mb-2`}>{title}</h5>
      <div className="space-y-3">
        {terms.map((term, idx) => (
          <div
            key={`${title}-${idx}`}
            className="bg-white/10 p-3 rounded-lg border border-white/20"
          >
            <p className="text-sm text-gray-100 mb-1">
              <strong>Section {term.section}</strong>
            </p>
            <ul className="text-xs text-gray-200 list-disc ml-4">
              {term.meetings?.length ? (
                term.meetings.map((m, i) => {
                  const hasInstructor = m.firstName && m.firstName !== "TBA";
                  
                  return (
                    <li key={i}>
                      {m.type}: {hasInstructor ? `${m.firstName} ${m.lastName}` : "TBA"}
                      {hasInstructor && m.avgRating && m.numberOfRatings && (
                        <span className="text-yellow-200 ml-2">
                          ⭐ {m.avgRating.toFixed(1)} ({m.numberOfRatings} ratings)
                          {m.wouldTakeAgainPercent && (
                            <span className="ml-1">
                              • {m.wouldTakeAgainPercent.toFixed(0)}% would take again
                            </span>
                          )}
                        </span>
                      )}
                      {hasInstructor && m.rateMyProfLink && (
                        <a
                          href={m.rateMyProfLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 ml-2 hover:underline"
                        >
                          View RMP
                        </a>
                      )}
                    </li>
                  );
                })
              ) : (
                <li className="italic text-gray-300">No meeting info</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TermSection;