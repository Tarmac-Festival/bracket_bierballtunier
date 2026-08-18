export type TournamentStatus = 'OPEN' | 'ARCHIVED';

export type TournamentFilter = 'ALL' | TournamentStatus;

export interface TournamentMinimal {
  id: number;
}

// An empty field is filled in with a default on submit, so it must not block validation.
export function teamSizeRangeIsValid(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): boolean {
  if (min === '' || min == null || max === '' || max == null) return true;
  return Number(min) > 0 && Number(min) <= Number(max);
}
