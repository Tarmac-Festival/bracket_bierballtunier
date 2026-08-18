import { Dayjs } from 'dayjs';
import { createAxios, handleRequestError } from './adapter';

export async function createTournament(
  club_id: number,
  name: string,
  dashboard_public: boolean,
  dashboard_endpoint: string,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
  start_time: Dayjs,
  duration_minutes: number,
  margin_minutes: number,
  rules?: string,
  registration_enabled?: boolean,
  registration_deadline?: Dayjs | null,
  team_size_min?: number,
  team_size_max?: number,
  max_teams?: number | null,
) {
  return createAxios()
    .post('tournaments', {
      name,
      club_id,
      dashboard_public,
      dashboard_endpoint,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
      start_time,
      duration_minutes,
      margin_minutes,
      rules,
      registration_enabled,
      registration_deadline,
      team_size_min,
      team_size_max,
      max_teams,
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
  name: string,
  dashboard_public: boolean,
  dashboard_endpoint: string | null | undefined,
  players_can_be_in_multiple_teams: boolean,
  auto_assign_courts: boolean,
  start_time: string,
  duration_minutes: number,
  margin_minutes: number,
  rules?: string | null,
  registration_enabled?: boolean,
  registration_deadline?: Dayjs | string | null,
  team_size_min?: number,
  team_size_max?: number,
  max_teams?: number | null,
) {
  return createAxios()
    .put(`tournaments/${tournament_id}`, {
      name,
      dashboard_public,
      dashboard_endpoint,
      players_can_be_in_multiple_teams,
      auto_assign_courts,
      start_time,
      duration_minutes,
      margin_minutes,
      rules,
      registration_enabled,
      registration_deadline,
      team_size_min,
      team_size_max,
      max_teams,
    })
    .catch((response: any) => handleRequestError(response));
}
