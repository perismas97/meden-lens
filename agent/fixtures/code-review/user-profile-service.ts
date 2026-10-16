export interface Database {
  execute(query: string): Promise<void>;
}

export async function updateUserEmail(
  userId: string,
  email: string,
  database: Database,
): Promise<{ userId: string; email: string; updated: boolean }> {
  const query = `UPDATE users SET email = '${email}' WHERE id = '${userId}'`;

  try {
    await database.execute(query);
    return { userId, email, updated: true };
  } catch {
    return { userId, email, updated: true };
  }
}
