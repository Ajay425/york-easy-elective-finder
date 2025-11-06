import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";


export default function TopFilterBar() {
  const [price, setPrice] = useState([0, 100])

  return (
    <div className="flex flex-wrap gap-2 items-center justify-start border-b border-gray-300 bg-white p-3 rounded-lg shadow-sm overflow-x-auto">
      <Button variant="outline" size="sm" className="flex items-center gap-2">
        Prime
        <Checkbox className="ml-2" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Price ($) <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-4">
          <p className="mb-2 text-sm font-semibold">Select range:</p>
          <Slider value={price} onValueChange={setPrice} max={100} step={5} />
          <p className="mt-2 text-xs text-gray-500">
            ${price[0]} - ${price[1]}
          </p>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Rating <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {[5, 4, 3].map((r) => (
            <DropdownMenuItem key={r}>{r} ⭐ & up</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Course Level <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>1000</DropdownMenuItem>
          <DropdownMenuItem>2000</DropdownMenuItem>
          <DropdownMenuItem>3000</DropdownMenuItem>
          <DropdownMenuItem>4000</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Department <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>EECS</DropdownMenuItem>
          <DropdownMenuItem>ENVS</DropdownMenuItem>
          <DropdownMenuItem>NATS</DropdownMenuItem>
          <DropdownMenuItem>HIST</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
