"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function LoginForm() {
  const [name, setName] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = (name: string) => {
    // set the name query param
    router.replace(`/?name=${name}`);
    setSuccess(true);
  };

  return (
    <Card className="w-full max-w-md">
      {success ? (
        <CardHeader>
          <CardTitle className="text-2xl">Success</CardTitle>
          <CardDescription>
            Logged in. Your request will now be completed.
          </CardDescription>
        </CardHeader>
      ) : (
        <>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>Enter your name to continue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Joe Shmo"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(name);
              }}
              className="w-full"
            >
              Submit
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
