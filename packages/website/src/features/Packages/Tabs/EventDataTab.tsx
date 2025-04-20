import { FC } from 'react';
import { EventsTable } from '../EventsTable';
import SearchInput from '@/components/SearchInput';
import { useState } from 'react';
import isEmpty from 'lodash/isEmpty';

const searchInObject = (obj: unknown, term: string, key?: string): boolean => {
  if (key && key.toLowerCase().includes(term.toLowerCase())) {
    return true;
  }
  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(term.toLowerCase());
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.entries(obj).some(([k, value]) =>
      searchInObject(value, term, k)
    );
  }
  return false;
};

export const EventDataTab: FC<{
  extrasState: Record<string, unknown>;
}> = ({ extrasState }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredExtrasState = Object.fromEntries(
    Object.entries(extrasState).filter(([key, val]) =>
      searchInObject(val, searchTerm, key)
    )
  );

  if (isEmpty(extrasState)) {
    return (
      <div>
        <div className="px-4 pt-4 pb-2">
          <div className="flex flex-col md:flex-row justify-start items-center">
            <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
              <p className="text-muted-foreground text-lg">
                No event data was captured during the build.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <div className="flex flex-col md:flex-row justify-start items-center">
          <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
            <p className="text-muted-foreground text-lg">
              This includes event data captured during the build, referenced in
              dependent operations.
            </p>
          </div>
          <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
            <SearchInput onSearchChange={setSearchTerm} />
          </div>
        </div>
      </div>
      {!isEmpty(filteredExtrasState) && (
        <div className="max-w-full mx-4 my-2">
          <EventsTable extrasState={filteredExtrasState} />
        </div>
      )}
    </div>
  );
};

export default EventDataTab;
