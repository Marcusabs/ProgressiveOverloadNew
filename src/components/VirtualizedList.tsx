import React, { memo, useCallback } from 'react';
import { FlatList, ListRenderItem, ViewStyle } from 'react-native';

interface VirtualizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  style?: ViewStyle;
  itemHeight?: number;
  windowSize?: number;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  initialNumToRender?: number;
  removeClippedSubviews?: boolean;
}

function VirtualizedListComponent<T>({
  data,
  renderItem,
  keyExtractor,
  style,
  itemHeight = 80,
  windowSize = 10,
  maxToRenderPerBatch = 5,
  updateCellsBatchingPeriod = 100,
  initialNumToRender = 10,
  removeClippedSubviews = true,
}: VirtualizedListProps<T>) {
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={style}
      getItemLayout={getItemLayout}
      windowSize={windowSize}
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      initialNumToRender={initialNumToRender}
      removeClippedSubviews={removeClippedSubviews}
      showsVerticalScrollIndicator={false}
    />
  );
}

export const VirtualizedList = memo(VirtualizedListComponent) as typeof VirtualizedListComponent;
