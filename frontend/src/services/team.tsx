import { awaitRequestAndHandleError, createAxios, handleRequestError } from './adapter';

export async function createTeam(
  tournament_id: number,
  name: string,
  active: boolean,
  player_ids: string[],
) {
  return createAxios()
    .post(`tournaments/${tournament_id}/teams`, {
      name,
      active,
      player_ids,
    })
    .catch((response: any) => handleRequestError(response));
}

export async function createTeams(tournament_id: number, names: string, active: boolean) {
  return createAxios()
    .post(`tournaments/${tournament_id}/teams_multi`, { names, active })
    .catch((response: any) => handleRequestError(response));
}

export async function deleteTeam(tournament_id: number, team_id: number) {
  await createAxios()
    .delete(`tournaments/${tournament_id}/teams/${team_id}`)
    .catch((response: any) => handleRequestError(response));
}

export async function registerTeam(
  tournament_id: number,
  name: string,
  player_names: string[],
  password?: string,
  accepted_terms?: string[],
  contact_name?: string,
  contact_phone?: string,
  logo?: string | null,
  description?: string | null,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.post(`tournaments/${tournament_id}/register`, {
      name,
      player_names,
      password: password || null,
      accepted_terms: accepted_terms ?? [],
      contact_name: contact_name || null,
      contact_phone: contact_phone || null,
      logo: logo || null,
      description: description || null,
    }),
  );
}

export async function mergeTeam(
  tournament_id: number,
  team_id: number,
  target_team_id: number,
  target_team_name?: string | null,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.post(`tournaments/${tournament_id}/teams/${team_id}/merge`, {
      target_team_id,
      target_team_name: target_team_name || null,
    }),
  );
}

export async function splitTeam(
  tournament_id: number,
  team_id: number,
  assignments: { [player_id: string]: number },
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.post(`tournaments/${tournament_id}/teams/${team_id}/split`, {
      assignments,
    }),
  );
}

export async function updateTeam(
  tournament_id: number,
  team_id: number,
  name: string,
  active: boolean,
  player_ids: string[],
  contact_name?: string | null,
  contact_phone?: string | null,
  description?: string | null,
) {
  return awaitRequestAndHandleError(async (axios) =>
    axios.put(`tournaments/${tournament_id}/teams/${team_id}`, {
      name,
      active,
      player_ids,
      contact_name: contact_name || null,
      contact_phone: contact_phone || null,
      description: description || null,
    }),
  );
}
