import dayjs, { Dayjs } from 'dayjs';
import { createAxios, handleRequestError } from './adapter';

// Mantine's NumberInput yields '' when the field is cleared, which the API rejects.
function optionalNumber(value: number | string | null | undefined): number | null {
  return value === '' || value == null ? null : Number(value);
}

// Mantine's date pickers yield a 'YYYY-MM-DD HH:mm:ss' string, while initial values
// are Dayjs objects. dayjs() normalises both (and Date) to an ISO string for the API.
export function isoDate(value: Dayjs | Date | string | null | undefined): string | null {
  return value === '' || value == null ? null : dayjs(value).toISOString();
}

function numberOrDefault(value: number | string | null | undefined, fallback: number): number {
  return value === '' || value == null ? fallback : Number(value);
}

export async function createTournament(
  club_id: number,
  name: string,
  dashboard_public: boolean,
  dashboard_endpoint: string,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
  start_time: Dayjs | Date | string,
  duration_minutes: number,
  margin_minutes: number,
  rules?: string,
  registration_enabled?: boolean,
  registration_info?: string | null,
  registration_password?: string | null,
  remove_registration_password?: boolean,
  registration_deadline?: Dayjs | Date | string | null,
  team_size_min?: number | string | null,
  team_size_max?: number | string | null,
  max_teams?: number | string | null,
  registration_terms?: string | null,
  registration_contact_required?: boolean,
) {
  return createAxios()
    .post('tournaments', {
      name,
      club_id,
      dashboard_public,
      dashboard_endpoint,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
      start_time: isoDate(start_time),
      duration_minutes,
      margin_minutes,
      rules,
      registration_enabled,
      registration_info,
      registration_password: registration_password || null,
      remove_registration_password: remove_registration_password ?? false,
      registration_deadline: isoDate(registration_deadline),
      team_size_min: numberOrDefault(team_size_min, 1),
      team_size_max: numberOrDefault(team_size_max, 8),
      max_teams: optionalNumber(max_teams),
      registration_terms,
      registration_contact_required: registration_contact_required ?? false,
    })
    .catch((response: any) => handleRequestError(response));
}

export async function deleteTournament(tournament_id: number) {
  return createAxios().delete(`tournaments/${tournament_id}`);
}

export async function archiveTournament(tournament_id: number) {
  return createAxios().post(`tournaments/${tournament_id}/change-status`, { status: 'ARCHIVED' });
}

export async function unarchiveTournament(tournament_id: number) {
  return createAxios().post(`tournaments/${tournament_id}/change-status`, { status: 'OPEN' });
}

export async function updateTournament(
  tournament_id: number,
  club_id: number,
  name: string,
  dashboard_public: boolean,
  dashboard_endpoint: string | null | undefined,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
  start_time: Dayjs | Date | string,
  duration_minutes: number,
  margin_minutes: number,
  rules?: string | null,
  registration_enabled?: boolean,
  registration_info?: string | null,
  registration_password?: string | null,
  remove_registration_password?: boolean,
  registration_deadline?: Dayjs | Date | string | null,
  team_size_min?: number | string | null,
  team_size_max?: number | string | null,
  max_teams?: number | string | null,
  registration_terms?: string | null,
  registration_contact_required?: boolean,
) {
  return createAxios()
    .put(`tournaments/${tournament_id}`, {
      club_id,
      name,
      dashboard_public,
      dashboard_endpoint,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
      start_time: isoDate(start_time),
      duration_minutes,
      margin_minutes,
      rules,
      registration_enabled,
      registration_info,
      registration_password: registration_password || null,
      remove_registration_password: remove_registration_password ?? false,
      registration_deadline: isoDate(registration_deadline),
      team_size_min: numberOrDefault(team_size_min, 1),
      team_size_max: numberOrDefault(team_size_max, 8),
      max_teams: optionalNumber(max_teams),
      registration_terms,
      registration_contact_required: registration_contact_required ?? false,
    })
    .catch((response: any) => handleRequestError(response));
}
