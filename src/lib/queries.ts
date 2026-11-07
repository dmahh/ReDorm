import { queryOptions } from "@tanstack/react-query";
import { listItems } from "./redorm.functions";

export const itemsQuery = queryOptions({
  queryKey: ["items"],
  queryFn: () => listItems(),
  staleTime: 15_000,
});
