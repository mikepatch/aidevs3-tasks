export type User = {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
};

export type Connection = {
  user1_id: string;
  user2_id: string;
};
