import React, { useState, useRef } from 'react';
import { Freeboard } from './Freeboard';

export function HomeView() {
    return (
        <div className="h-full w-full bg-[#313338] overflow-hidden">
            <Freeboard />
        </div>
    );
}
