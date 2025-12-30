import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Typography,
    Skeleton,
} from '@mui/material';

export interface Column<T> {
    id: keyof T | string;
    label: string;
    align?: 'left' | 'right' | 'center';
    minWidth?: number;
    format?: (value: any, row: T) => React.ReactNode;
}

export interface BasicTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (row: T) => void;
    rowKey?: keyof T;
}

export function BasicTable<T>({ 
    columns, 
    data, 
    loading = false, 
    emptyMessage = "No data available",
    onRowClick,
    rowKey
}: BasicTableProps<T>) {
    const rows = Array.isArray(data) ? data : [];
    
    if (loading) {
        return (
            <TableContainer component={Paper} elevation={0}>
                <Table>
                     <TableHead>
                        <TableRow>
                            {columns.map((col) => (
                                <TableCell key={String(col.id)}>{col.label}</TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[1, 2, 3].map((i) => (
                            <TableRow key={i}>
                                {columns.map((_, idx) => (
                                    <TableCell key={idx}><Skeleton /></TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }

    if (rows.length === 0) {
        return (
             <Box p={4} textAlign="center" component={Paper} elevation={0}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0}>
            <Table>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell
                                key={String(column.id)}
                                align={column.align || 'left'}
                                style={{ minWidth: column.minWidth }}
                            >
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row, index) => {
                        const explicitKey = rowKey ? (row as any)?.[rowKey as any] : undefined;
                        const key =
                            explicitKey != null && String(explicitKey).length > 0
                                ? String(explicitKey)
                                : (row as any)?.id != null
                                    ? String((row as any).id)
                                    : String(index);
                        return (
                            <TableRow 
                                hover 
                                role="checkbox" 
                                tabIndex={-1} 
                                key={key}
                                onClick={() => onRowClick && onRowClick(row)}
                                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                            >
                                {columns.map((column) => {
                                    // @ts-ignore
                                    const value = row[column.id];
                                    return (
                                        <TableCell key={String(column.id)} align={column.align || 'left'}>
                                            {column.format ? column.format(value, row) : (value ?? '—')}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
