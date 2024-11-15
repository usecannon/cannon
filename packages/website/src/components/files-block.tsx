'use client';

import React from 'react';
import { File, Folder, Tree } from '@/components/ui/file-tree';

export const FilesBlock = ({
  quantity,
  elements,
}: {
  quantity: number;
  elements: any[];
}) => {
  const initiaExpanded = Array.from({ length: quantity }, (_, i) =>
    (i + 1).toString()
  );

  const ITEM_TYPE: { [key: string]: React.ElementType } = {
    folder: (props) => <Folder {...props} />,
    file: (props) => <File {...props} />,
  };

  return (
    <div className="relative flex h-fit w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background md:shadow-xl mt-2">
      <Tree
        className="p-2 overflow-hidden rounded-md bg-background"
        initialExpandedItems={initiaExpanded}
      >
        {elements.map((element) => {
          const Component = ITEM_TYPE[
            element.type as string
          ] as React.ElementType;

          return (
            <Component
              key={element.id}
              value={element.id}
              element={element.name}
            >
              {element.children ? (
                element.children.map((first: any) => {
                  const Component = ITEM_TYPE[first.type] as React.ElementType;

                  return (
                    <>
                      <Component
                        key={first.id}
                        value={first.id}
                        element={first.name}
                      >
                        {first.children
                          ? first.children.map((second: any) => {
                              const Component = ITEM_TYPE[
                                second.type
                              ] as React.ElementType;

                              return (
                                <>
                                  <Component
                                    key={second.id}
                                    value={second.id}
                                    element={second.name}
                                  >
                                    {second.children
                                      ? second.children.map((third: any) => {
                                          const Component = ITEM_TYPE[
                                            third.type
                                          ] as React.ElementType;

                                          return (
                                            <>
                                              <Component
                                                key={third.id}
                                                value={third.id}
                                                element={third.name}
                                              >
                                                {third.type === 'file' && (
                                                  <p>{third.name}</p>
                                                )}
                                              </Component>
                                            </>
                                          );
                                        })
                                      : second.type === 'file' && (
                                          <p>{second.name}</p>
                                        )}
                                  </Component>
                                </>
                              );
                            })
                          : first.type === 'file' && <p>{first.name}</p>}
                      </Component>
                    </>
                  );
                })
              ) : (
                <p>{element.name}</p>
              )}
            </Component>
          );
        })}
      </Tree>
    </div>
  );
};
