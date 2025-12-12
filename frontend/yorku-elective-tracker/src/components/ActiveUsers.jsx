import { useEffect, useState } from "react"; 
import { io } from "socket.io-client";
import { Users } from "lucide-react";

const socket = io("york-easy-elective-finder-production.up.railway.app", {
    transports: ["websocket"],
    secure: true,   
});


export function ActiveUsers() {
    const [active, setActive] = useState(0);

    useEffect(() => {
        socket.on("activeUsers", setActive);
        return () => socket.off("activeUsers");
    }, []);

    return (
        <div className="
            flex items-center gap-3
            px-4 py-2.5
            rounded-xl

            bg-emerald-500/10
            backdrop-blur-md

            border border-emerald-400/30
            shadow-[0_0_15px_-5px_rgba(16,185,129,0.5)]

            hover:bg-emerald-500/15
            hover:border-emerald-400/50
            hover:shadow-[0_0_20px_-4px_rgba(16,185,129,0.7)]

            transition-all duration-300 ease-out
            group
        ">
            {/* Icon + Pulse */}
            <div className="relative flex items-center">
                <Users
                    className="
                        w-4 h-4
                        text-emerald-300 
                        group-hover:text-emerald-200
                        transition-all duration-300
                    "
                />
                
                {/* Online Pulse Dot */}
                <span className="
                    absolute -top-1.5 -right-1.5 
                    w-2.5 h-2.5 
                    bg-emerald-400 
                    rounded-full 
                    shadow-[0_0_8px_2px_rgba(16,185,129,0.7)]
                    animate-ping
                "></span>

                <span className="
                    absolute -top-1.5 -right-1.5
                    w-2.5 h-2.5 
                    bg-emerald-400 
                    rounded-full
                "></span>
            </div>

            {/* Text */}
            <div className="flex flex-col leading-none">
                <span className="
                    text-xs font-semibold 
                    text-emerald-200 
                    group-hover:text-emerald-100
                    transition-colors duration-300
                ">
                    {active} {active === 1 ? "user" : "users"} online
                </span>

                <span className="
                    text-[10px] text-emerald-300/60
                    group-hover:text-emerald-300/80
                    transition-colors duration-300
                ">
                </span>
            </div>
        </div>
    );
}
