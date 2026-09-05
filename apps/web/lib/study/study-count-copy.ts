type CompletedStudyCounts = Readonly<{
  lessons: number;
  reviews: number;
}>;

export function formatCompletedStudySummary({
  lessons,
  reviews,
}: CompletedStudyCounts): string {
  const lessonLabel = lessons === 1 ? "aula" : "aulas";
  const reviewLabel = reviews === 1 ? "revisão" : "revisões";
  const reviewCompletion = reviews === 1 ? "concluída" : "concluídas";

  return `${lessons} ${lessonLabel} e ${reviews} ${reviewLabel} ${reviewCompletion} a partir dos itens persistidos.`;
}

export function formatPlannedReviewsSummary(reviewCount: number): string {
  const reviewLabel = reviewCount === 1 ? "revisão" : "revisões";
  return `${reviewCount} ${reviewLabel} no plano`;
}
