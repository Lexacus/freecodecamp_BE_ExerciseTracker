export type LogsFilters = {
  ownerId: string;
  date?: {
    $gte?: string;
    $lte?: string;
  };
  limit?: string;
};
