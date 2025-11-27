import React, { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "../ui/button";
import { set } from "zod";

const ContactUs = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });


  const onSubmit = async (data) => {
  console.log("Submitting form:", data);

  try {
    const formData = new FormData();
    formData.set("access_key", "d2a725ac-5fce-4d7d-bb9a-4ce8e754537a");
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("message", data.message);

    console.log("FORMDATA SENT:", Object.fromEntries(formData.entries()));
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    });

    console.log("Raw Web3Forms Response:", res);

    // If response is NOT ok, log more details
    if (!res.ok) {
      console.error(
        "%c[WEB3FORMS ERROR] Response not OK",
        "color:red; font-weight:bold;"
      );
      console.error("Status:", res.status);
      console.error("Status Text:", res.statusText);
      console.error("URL:", res.url);
    }

    const result = await res.json();
    console.log("Parsed JSON:", result);

    if (result.success) {
      setSubmitted(true);
      form.reset();
      setTimeout(() => setSubmitted(false), 3000);
    } else {
      console.error("[WEB3FORMS FAILURE]", result);
      alert("Error: " + result.message);
    }
  } catch (err) {
    console.error("%c[NETWORK ERROR contacting Web3Forms]", "color:red;", err);
    alert("Network error — check console for details.");
  }
};






  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a] text-white flex flex-col items-center overflow-x-hidden">

      {/* Background Glows */}
      <div className="absolute w-[500px] h-[500px] bg-purple-800 rounded-full blur-[180px] opacity-25 top-[-120px] left-1/2 -translate-x-1/2 animate-pulse"></div>
      <div className="absolute w-[500px] h-[500px] bg-blue-700 rounded-full blur-[180px] opacity-20 bottom-[-150px] left-1/2 -translate-x-1/2 animate-pulse"></div>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/10 border border-purple-400/30 rounded-lg hover:from-purple-500/40 hover:to-pink-500/30 hover:border-purple-400 transition-all duration-300 text-purple-300 hover:text-purple-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">Back</span>
      </button>

      {/* Header Section */}
      <section className="relative z-10 pt-16 pb-8 w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Mail className="w-8 h-8 text-purple-300" />
          <h1 className="text-3xl md:text-5xl font-extrabold text-[#7f5af0] drop-shadow-[0_0_15px_rgba(127,90,240,0.35)]">
            Get In Touch
          </h1>
        </div>
        <p className="text-gray-300 max-w-2xl mx-auto px-6">
          Have a question, suggestion, or found a bug? We'd love to hear from you.
        </p>
      </section>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md px-6 pb-16">
        <div className="bg-gradient-to-br from-gray-800/40 via-gray-900/40 to-black/40 backdrop-blur-xl border border-white/5 shadow-lg shadow-black/20 rounded-2xl p-8 hover:border-[#7f5af0]/30 transition-all duration-300">

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-2xl text-white">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-green-400">Thank You!</h2>
              <p className="text-gray-300">We've received your message.</p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                {/* Hidden Web3Forms Required Fields */}
                <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE" />
                <input type="checkbox" name="botcheck" className="hidden" />

                {/* Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: "Name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <input
                          placeholder="John Doe"
                          {...field}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7f5af0]"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7f5af0]"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Message Field */}
                <FormField
                  control={form.control}
                  name="message"
                  rules={{
                    required: "Message is required",
                    minLength: { value: 10, message: "Message must be at least 10 characters" },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Message
                      </FormLabel>
                      <FormControl>
                        <textarea
                          rows={4}
                          placeholder="Tell us what's on your mind..."
                          {...field}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#7f5af0] resize-none"
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-400" />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
        <Button
          className="
            relative overflow-hidden text-lg font-semibold px-10 py-6 rounded-2xl shadow-md
            bg-white text-[#7f5af0] border border-white/10
            transition-all duration-500 hover:scale-105 
            hover:shadow-[0_0_30px_rgba(127,90,240,0.45)]
            group disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {/* Sliding Color Animation (TrackMySubs style) */}
          <span
            className="
              absolute inset-0 bg-gradient-to-r 
              from-[#7f5af0] via-[#6a4fff] to-[#3a68ff]
              translate-x-[-100%]
              group-hover:translate-x-0
              transition-transform duration-700 ease-out rounded-2xl"
          ></span>

          <span className="relative z-10 transition-colors duration-500 group-hover:text-white">
                  Submit Message
          </span>
        </Button>
      </div>

              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactUs;