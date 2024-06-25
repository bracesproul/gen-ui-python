"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import { startCase } from "lodash";

export interface XAxisFilterProps {
  keys: string[];
  onFilter: (key: string) => void;
}

/**
 * JSX element representing a dropdown that allows the user to select
 * which data to display across the x-axis.
 */
export function XAxisFilter(props: XAxisFilterProps): JSX.Element {
  return (
    <Select onValueChange={props.onFilter}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="X-Axis Data" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Data</SelectLabel>
          {props.keys.map((key) => (
            <SelectItem key={key} value={key}>
              {startCase(key)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export interface FilterButtonProps {
  filterKey: string;
  filterValue: string | number;
}

export function FilterButton(props: FilterButtonProps): JSX.Element {
  return (
    <div className="p-2 min-w-[100px] rounded-md border-[0.5px] border-gray-400 flex flex-row items-start justify-center gap-[2px]">
      <p className="font-medium text-sm text-gray-700">
        {startCase(props.filterKey)}:
      </p>
      <p className="font-normal text-sm">{props.filterValue}</p>
    </div>
  );
}
