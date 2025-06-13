'use client';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { ArrowUpTrayIcon, BuildingLibraryIcon, ChartBarIcon, FolderMinusIcon } from '@heroicons/react/24/outline';

const Header = () => {
    return (
        <header className="bg-gray-800 p-4 text-center flex justify-between items-center">
            <li className='list-none'>
                <Image src="/Logo_COVEMS.svg" alt="Logo" width={150} height={100} className="mx-auto w-36 h-auto" priority />
            </li>
            <ul className='flex justify-center gap-4'>
                <li className="text-white">
                    <Link href="/upload_request" className='flex items-center text-white hover:text-gray-300'>
                        <FolderMinusIcon className="h-5 w-5 inline-block mr-2" />
                        Agregar Solicitud
                    </Link>
                </li>
                <li className="text-white">
                    <Link href="/upload_policy" className='flex items-center text-white hover:text-gray-300'>
                        <ArrowUpTrayIcon className="h-5 w-5 inline-block mr-2" />
                        Cargar Polizas
                    </Link>
                </li>
                <li className="text-white">
                    <Link href="/upload_statement" className='flex items-center text-white hover:text-gray-300'>
                        <BuildingLibraryIcon className="h-5 w-5 inline-block mr-2" />
                        Cargar estado de cuenta
                    </Link>
                </li>
                <li className="text-white">
                    <Link href="/statements" className='flex items-center text-white hover:text-gray-300'>
                        <ChartBarIcon className="h-5 w-5 inline-block mr-2" />
                        Estados de cuenta
                    </Link>
                </li>
            </ul>
        </header>
    );
};

export default Header;